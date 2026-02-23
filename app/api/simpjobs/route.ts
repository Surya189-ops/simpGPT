// app/api/simpjobs/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Import AI cache
import { aiCache, cacheKeys } from "@/lib/jobs/aiCache";

// Import mock job generator
import { generateRealisticMockJobs } from "@/lib/jobs/mockJobGenerator";

// Import scoring engine
import {
  calculateWeightedScore,
  deduplicateJobs,
  filterIrrelevantJobs,
  shouldUseAIRanking,
  applyMinimumThreshold,
  generateMatchReasons,
} from "@/lib/jobs/scoringEngine";

function normalizeJobRole(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidJobQuery(input: string) {
  if (!input) return false;

  const q = input.trim().toLowerCase();

  if (q.length < 3) return false;
  if (!/[aeiou]/.test(q)) return false;

  const roleHints = [
    "developer", "engineer", "intern", "designer", "manager",
    "analyst", "software", "frontend", "backend", "data",
  ];

  return q.includes(" ") || roleHints.some(word => q.includes(word));
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TIER_LIMITS = {
  free: {
    searchesPerDay: 5,
    resultsPerSearch: 5,
    savedJobs: 5,
  },
  starter: {
    searchesPerDay: 50,
    resultsPerSearch: 20,
    savedJobs: Infinity,
  },
  pro: {
    searchesPerDay: Infinity,
    resultsPerSearch: 50,
    savedJobs: Infinity,
  },
};

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  matchPercentage: number;
  posted: string;
  type?: string;
  matchReasons?: string[];
}

const jobSiteConfigs: Record<string, { domains: string[]; searchPattern: string }> = {
  linkedin: {
    domains: ["linkedin.com"],
    searchPattern: "site:linkedin.com/jobs {role} {location}",
  },
  indeed: {
    domains: ["indeed.com", "indeed.co.in"],
    searchPattern: "site:indeed.com {role} {location}",
  },
  naukri: {
    domains: ["naukri.com"],
    searchPattern: "site:naukri.com {role} {location}",
  },
  wellfound: {
    domains: ["wellfound.com"],
    searchPattern: "site:wellfound.com jobs {role} {location}",
  },
  glassdoor: {
    domains: ["glassdoor.com"],
    searchPattern: "site:glassdoor.com/Job {role} {location}",
  },
  remote: {
    domains: ["remote.co", "weworkremotely.com", "remotive.io"],
    searchPattern: "remote {role} jobs",
  },
};

const locationJobSites: Record<string, string[]> = {
  india: ["naukri", "linkedin", "indeed"],
  us: ["linkedin", "indeed", "wellfound", "glassdoor"],
  uk: ["linkedin", "indeed", "glassdoor"],
  europe: ["linkedin", "indeed", "glassdoor"],
  remote: ["remote", "wellfound", "linkedin"],
};

// AI typo correction with caching and timeout
async function correctJobRoleWithAI(input: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return input;

  const cacheKey = cacheKeys.typoCorrection(input);

  return await aiCache.getOrCompute(
    cacheKey,
    async () => {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: "You correct job role spelling mistakes. Return ONLY the corrected job title. No explanations.",
            },
            {
              role: "user",
              content: input,
            },
          ],
          timeout: 10000,
        });

        const corrected = completion.choices[0].message.content?.trim();
        return corrected && corrected.length > 0 ? corrected : input;
      } catch (err: any) {
        console.error("AI typo correction failed:", err.message || err);
        return input;
      }
    },
    input
  );
}

// AI ranking with caching and timeout
async function rankJobsWithAI(
  jobs: Job[],
  jobRole: string,
  skills: string,
  experience: string
): Promise<Job[]> {
  if (!jobs.length || !process.env.OPENAI_API_KEY) return jobs;

  const cacheKey = cacheKeys.aiRanking(jobRole, skills, experience);

  try {
    const cachedScores = aiCache.get<Map<string, number>>(cacheKey);

    if (cachedScores) {
      return jobs
        .map(job => ({
          ...job,
          matchPercentage: Math.min(95, cachedScores.get(job.id) ?? job.matchPercentage),
        }))
        .sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    const prompt = `
You are ranking jobs for relevance.

User wants: ${jobRole}
Skills: ${skills || "not specified"}
Experience: ${experience || "not specified"}

Given the job titles below, return a relevance score from 0–100.

Return ONLY valid JSON array:
[
  { "id": "job-id", "score": number }
]

Jobs:
${jobs.map(j => `ID: ${j.id}, Title: ${j.title}`).join("\n")}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      timeout: 15000,
    });

    const raw = completion.choices[0].message.content || "[]";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const scores = JSON.parse(cleaned);

    const scoreMap = new Map(scores.map((s: any) => [s.id, s.score]));
    aiCache.set(cacheKey, scoreMap);

    return jobs
      .map(job => ({
        ...job,
        matchPercentage: Math.min(95, scoreMap.get(job.id) ?? job.matchPercentage),
      }))
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

  } catch (err: any) {
    console.error("AI ranking failed:", err.message || err);
    return jobs;
  }
}

// Resume ranking with caching and timeout
async function rankJobsWithResume(jobs: Job[], resumeData: any): Promise<Job[]> {
  if (!jobs.length || !resumeData || !process.env.OPENAI_API_KEY) return jobs;

  const userRole = resumeData.role || "";
  const cacheKey = cacheKeys.resumeRanking(resumeData, userRole);

  try {
    const cachedResults = aiCache.get<Map<string, { score: number; reasons: string[] }>>(cacheKey);

    if (cachedResults) {
      return jobs
        .map(job => {
          const match = cachedResults.get(job.id);
          return {
            ...job,
            matchPercentage: Math.min(95, match?.score ?? job.matchPercentage),
            matchReasons: match?.reasons?.length
              ? match.reasons
              : job.matchReasons || [],
          };
        })
        .sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    const userSkills = resumeData.skills?.join(", ") || "";
    const userExperience = resumeData.experience || "";

    const prompt = `
You are ranking jobs based on resume match.

Resume:
- Role: ${userRole}
- Experience: ${userExperience}
- Skills: ${userSkills}

Given the job titles below, return a relevance score from 0–100 based on how well they match the resume.

Return ONLY valid JSON array:
[
  { "id": "job-id", "score": number, "reasons": ["reason1", "reason2"] }
]

Jobs:
${jobs.map(j => `ID: ${j.id}, Title: ${j.title}, Company: ${j.company}`).join("\n")}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      timeout: 15000,
    });

    const raw = completion.choices[0].message.content || "[]";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const scores = JSON.parse(cleaned);

    const scoreMap = new Map(
      scores.map((s: any) => [s.id, { score: s.score, reasons: s.reasons }])
    );

    aiCache.set(cacheKey, scoreMap);

    return jobs
      .map(job => {
        const match = scoreMap.get(job.id);
        return {
          ...job,
          matchPercentage: Math.min(95, match?.score ?? job.matchPercentage),
          // Preserve deterministic matchReasons, only override if AI provides reasons
          matchReasons: match?.reasons?.length
            ? match.reasons
            : job.matchReasons || [],
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

  } catch (err: any) {
    console.error("Resume-based ranking failed:", err.message || err);
    return jobs;
  }
}

export async function POST(req: Request) {
  let user: any = null;

  try {
    const body = await req.json();
    const userCountry = body.country || "GLOBAL";
    const rawJobRole = body.jobRole || "";
    const displayRole = rawJobRole.trim();

    // AI typo correction (cached)
    const correctedRole = await correctJobRoleWithAI(displayRole);
    const normalizedRole = normalizeJobRole(correctedRole);

    // Block invalid queries
    if (!isValidJobQuery(displayRole)) {
      return new Response(
        JSON.stringify({
          jobs: [],
          emptyReason: "invalid_query",
          meta: {
            tier: "free",
            searchCount: null,
            searchesLimit: null,
          },
        }),
        { status: 200 }
      );
    }

    const { location, experience, skills, selectedSite } = body;
    const session = await getServerSession(authOptions);

    let tier: "free" | "starter" | "pro" = "free";
    let limits = TIER_LIMITS.free;

    // Global users get starter tier
    if (userCountry !== "IN") {
      tier = "starter";
      limits = TIER_LIMITS.starter;
    }

    let updatedSearchCount: number | null = null;

    // User authentication and limits
    if (session?.user?.email && userCountry === "IN") {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 401 }
        );
      }

      tier = (user.subscriptionTier as "free" | "starter" | "pro") || "free";
      limits = TIER_LIMITS[tier];

      // Cooldown check
      if (user.lastSearchAt) {
        const diff = Date.now() - new Date(user.lastSearchAt).getTime();
        if (diff < 3000) {
          return new Response(
            JSON.stringify({ error: "SEARCH_COOLDOWN" }),
            { status: 429 }
          );
        }
      }

      // Daily reset
      const today = new Date().toDateString();
      const lastReset = user.lastSearchReset
        ? new Date(user.lastSearchReset).toDateString()
        : null;

      if (!lastReset || today !== lastReset) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            searchCount: 0,
            lastSearchReset: new Date(),
          },
        });
      }

      // Increment search count
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          searchCount: { increment: 1 },
          lastSearchAt: new Date(),
        },
      });

      updatedSearchCount = updatedUser.searchCount;

      // Enforce limits
      if (
        limits.searchesPerDay !== Infinity &&
        updatedSearchCount > limits.searchesPerDay
      ) {
        return new Response(
          JSON.stringify({ error: "FREE_LIMIT_REACHED" }),
          { status: 403 }
        );
      }
    }

    // Generate realistic mock jobs
    let jobs = generateRealisticMockJobs(
      correctedRole,
      location,
      selectedSite || "all",
      skills || "",
      experience || "",
      tier === "pro",
      locationJobSites
    );

    // ✅ Apply weighted scoring AND generate match reasons together
    jobs = jobs.map(job => {
      const score = calculateWeightedScore(
        job,
        correctedRole,
        skills || "",
        experience || "",
        location
      );

      const reasons = generateMatchReasons(
        job,
        correctedRole,
        skills || "",
        experience || "",
        location
      );

      return {
        ...job,
        matchPercentage: score,
        matchReasons: reasons,
      };
    });

    // Filter irrelevant jobs
    jobs = filterIrrelevantJobs(jobs, correctedRole, experience || "");

    // Deduplicate
    jobs = deduplicateJobs(jobs);

    // Apply hard minimum threshold (remove jobs < 35%)
    jobs = applyMinimumThreshold(jobs, 35);

    // Sort by weighted score
    jobs.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // SMART AI RANKING: Only call OpenAI when necessary
    const isResumeSearch = body.useResume === true;
    const useAI = shouldUseAIRanking(skills || "", experience || "", jobs, isResumeSearch);

    if (
      session?.user &&
      process.env.OPENAI_API_KEY &&
      (tier === "starter" || tier === "pro") &&
      useAI
    ) {
      const jobsForAI = tier === "starter" ? jobs.slice(0, 20) : jobs;

      if (isResumeSearch && user?.resumeData) {
        const resumeData = JSON.parse(user.resumeData as string);
        jobs = await rankJobsWithResume(jobsForAI, resumeData);
      } else {
        jobs = await rankJobsWithAI(
          jobsForAI,
          displayRole,
          skills || "",
          experience || ""
        );
      }
    }

    // Final sort with freshness tiebreaker
    jobs.sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }

      const timeMap: Record<string, number> = {
        "Just now": 0,
        "1 day ago": 1,
        "2 days ago": 2,
        "3 days ago": 3,
        "1 week ago": 7,
      };

      return (timeMap[a.posted] ?? 99) - (timeMap[b.posted] ?? 99);
    });

    // Enforce result limits
    const limitedJobs =
      limits.resultsPerSearch === Infinity
        ? jobs
        : jobs.slice(0, limits.resultsPerSearch);

    return new Response(
      JSON.stringify({
        jobs: limitedJobs,
        correctedRole,
        meta: {
          tier,
          searchCount: updatedSearchCount ?? null,
          searchesLimit:
            limits.searchesPerDay === Infinity
              ? null
              : limits.searchesPerDay,
        },
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("SimpJobs API error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500 }
    );
  }
}