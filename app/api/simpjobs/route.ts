// app/api/simpjobs/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";


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

  // too short
  if (q.length < 3) return false;

  // no vowels = garbage
  if (!/[aeiou]/.test(q)) return false;

  const roleHints = [
    "developer",
    "engineer",
    "intern",
    "designer",
    "manager",
    "analyst",
    "software",
    "frontend",
    "backend",
    "data",
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

// Job site configurations
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


// Location-based job site recommendations
const locationJobSites: Record<string, string[]> = {
  india: ["naukri", "linkedin", "indeed"],
  us: ["linkedin", "indeed", "wellfound", "glassdoor"],
  uk: ["linkedin", "indeed", "glassdoor"],
  europe: ["linkedin", "indeed", "glassdoor"],
  remote: ["remote", "wellfound", "linkedin"],
};


function calculateMatchPercentage(
  jobTitle: string,
  userSkills: string,
  userExperience: string
): number {
  let matchScore = 50; // Base score

  if (!userSkills && !userExperience) return matchScore;

  const titleLower = jobTitle.toLowerCase();

  // Skills matching
  if (userSkills) {
    const skills = userSkills.toLowerCase().split(/[,\s]+/).filter(Boolean);
    const matchedSkills = skills.filter(skill => titleLower.includes(skill));
    matchScore += Math.min(30, matchedSkills.length * 10);
  }

  // Experience matching
  if (userExperience && titleLower.includes(userExperience.toLowerCase())) {
    matchScore += 20;
  }

  // Cap at 95% (never show 100% to maintain credibility)
  return Math.min(95, matchScore);
}

function generateSearchQuery(
  jobRole: string,
  location: string,
  selectedSite: string,
  skills?: string
): string {
  const sitesToSearch = selectedSite === "all"
    ? locationJobSites[location] || ["linkedin", "indeed"]
    : [selectedSite];

  const queries = sitesToSearch.map(site => {
    const config = jobSiteConfigs[site];
    if (!config) return `${jobRole} jobs ${location}`;

    return config.searchPattern
      .replace("{role}", jobRole)
      .replace("{location}", location === "remote" ? "remote" : location);
  });

  return queries.join(" OR ");
}

function getRoleVariations(role: string, experience?: string) {
  const baseRole = normalizeJobRole(role);

  // 🎓 INTERN MODE
  if (experience === "intern") {
    return [
      `${role} Intern`,
      `${role} Internship`,
      `Intern - ${role}`,
      `Graduate Intern ${role}`,
      `${role} Trainee`,
    ];
  }

  const map: Record<string, string[]> = {
    "gym trainer": ["Gym Trainer", "Fitness Trainer", "Personal Trainer"],
    "video editor": ["Video Editor", "Content Editor", "Reels Editor"],
    "data analyst": ["Data Analyst", "Business Analyst"],
    "frontend developer": ["Frontend Developer", "React Developer"],
  };

  return map[baseRole] || [role];
}

async function correctJobRoleWithAI(input: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You correct job role spelling mistakes. Return ONLY the corrected job title. No explanations.",
        },
        {
          role: "user",
          content: input,
        },
      ],
    });

    const corrected = completion.choices[0].message.content?.trim();

    return corrected && corrected.length > 0 ? corrected : input;
  } catch {
    return input; // fallback (never break search)
  }
}


function generateMockJobs(
  jobRole: string,
  location: string,
  selectedSite: string,
  skills: string,
  experience: string,
  isPro: boolean
): Job[] {

  const companies = [
    "Google", "Microsoft", "Amazon", "Meta", "Apple",
    "Netflix", "Tesla", "Uber", "Airbnb", "Spotify",
    "Adobe", "Salesforce", "Oracle", "IBM", "Intel",
    "Cisco", "VMware", "Stripe", "Shopify", "Zoom",
    "TCS", "Infosys", "Wipro", "Accenture", "Cognizant"
  ];

  const jobTypes = ["Full-time", "Contract", "Part-time", "Remote"];
  const timePosted = ["Just now", "1 day ago", "2 days ago", "3 days ago", "1 week ago"];

  const sitesToUse = selectedSite === "all"
    ? locationJobSites[location] || ["linkedin", "indeed", "glassdoor"]
    : [selectedSite];

  const numJobs = isPro ? 25 : 12;
  const jobs: Job[] = [];

  // 🔑 Role variations (prevents "Developer" pollution)
  const roleVariants = getRoleVariations(jobRole, experience);

  for (let i = 0; i < numJobs; i++) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const site = sitesToUse[i % sitesToUse.length];
    const finalRole = roleVariants[i % roleVariants.length];

    const baseMatch = calculateMatchPercentage(jobRole, skills, experience);
    const variance = Math.floor(Math.random() * 15) - 5;
    const internPenalty = experience === "intern" ? -10 : 0;
    const matchPercentage = Math.max(
      40,
      Math.min(85, baseMatch + variance + internPenalty)
    );



    const locationName =
      location === "remote" ? "Remote" :
        location === "us" ? "United States" :
          location === "india" ? "India" :
            location === "uk" ? "United Kingdom" : "Europe";

    jobs.push({
      id: `job-${i}-${Date.now()}`,
      title: finalRole, // ✅ FIXED
      company,
      location: locationName,
      source: site,
      matchPercentage,
      posted: timePosted[Math.floor(Math.random() * timePosted.length)],
      type: jobTypes[Math.floor(Math.random() * jobTypes.length)],
    });
  }

  // 🆕 Latest + best match first
  return jobs.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

async function rankJobsWithAI(
  jobs: Job[],
  jobRole: string,
  skills: string,
  experience: string
): Promise<Job[]> {
  if (!jobs.length) return jobs;

  try {
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
    });

    const raw = completion.choices[0].message.content || "[]";

    // remove ```json ``` wrappers if present
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const scores = JSON.parse(cleaned);


    const scoreMap = new Map(
      scores.map((s: any) => [s.id, s.score])
    );

    return jobs
      .map(job => ({
        ...job,
        matchPercentage: Math.min(95, scoreMap.get(job.id) ?? job.matchPercentage),
      }))
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

  } catch (err) {
    console.error("AI ranking failed:", err);
    return jobs;
  }
}

async function rankJobsWithResume(
  jobs: Job[],
  resumeData: any
): Promise<Job[]> {
  if (!jobs.length || !resumeData) return jobs;

  try {
    const userSkills = resumeData.skills?.join(", ") || "";
    const userRole = resumeData.role || "";
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
    });

    const raw = completion.choices[0].message.content || "[]";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const scores = JSON.parse(cleaned);

    const scoreMap = new Map(
      scores.map((s: any) => [s.id, { score: s.score, reasons: s.reasons }])
    );

    return jobs
      .map(job => {
        const match = scoreMap.get(job.id);
        return {
          ...job,
          matchPercentage: Math.min(95, match?.score ?? job.matchPercentage),
          matchReasons: match?.reasons || [],
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

  } catch (err) {
    console.error("Resume-based ranking failed:", err);
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

    // 🔥 AI typo correction
    const correctedRole = await correctJobRoleWithAI(displayRole);

    // fallback normalize (for safety)
    const normalizedRole = normalizeJobRole(correctedRole);



    // 🚫 BLOCK nonsense searches
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

    // Initialize tier and limits outside the session block
    let tier: "free" | "starter" | "pro" = "free";
    let limits = TIER_LIMITS.free;

    // 🌍 GLOBAL users → free starter access (temporary)
    if (userCountry !== "IN") {
      tier = "starter";
      limits = TIER_LIMITS.starter;
    }

    let updatedSearchCount: number | null = null;

    // ✅ CHECK USER & LIMITS (SERVER-SIDE)
    // ✅ CHECK USER & LIMITS (SERVER-SIDE)
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

      // 🔓 logged-in logic ONLY
      tier = (user.subscriptionTier as "free" | "starter" | "pro") || "free";
      limits = TIER_LIMITS[tier];

      // ⏱️ cooldown
      if (user.lastSearchAt) {
        const diff = Date.now() - new Date(user.lastSearchAt).getTime();
        if (diff < 3000) {
          return new Response(
            JSON.stringify({ error: "SEARCH_COOLDOWN" }),
            { status: 429 }
          );
        }
      }

      // 🔁 daily reset
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

      // ➕ increment
      // ➕ increment
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          searchCount: { increment: 1 },
          lastSearchAt: new Date(),
        },
      });

      updatedSearchCount = updatedUser.searchCount;

      // 🚫 block ONLY when user EXCEEDS limit (6th search)
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

    // 🚨 GUEST USERS → NO COUNTING, NO PRISMA, NO BLOCK

    // -----------------------------
    // 🔍 YOUR JOB FETCH LOGIC BELOW
    // -----------------------------

    // ⚠️ REPLACE THIS MOCK WITH YOUR EXISTING JOB FETCH CODE
    let jobs = generateMockJobs(
      correctedRole,
      location,
      selectedSite || "all",
      skills || "",
      experience || "",
      tier === "pro"
    );



    // ✅ AI relevance ranking (ONLY starter + pro + API key present)
    if (
      session?.user &&
      process.env.OPENAI_API_KEY &&
      (tier === "starter" || tier === "pro")
    ) {
      const jobsForAI = tier === "starter" ? jobs.slice(0, 20) : jobs;

      // Check if this is a resume-based search
      const isResumeSearch = body.useResume === true;

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



    // 🆕 SORT LATEST JOBS FIRST
    jobs.sort((a, b) => {
      const timeMap: Record<string, number> = {
        "Just now": 0,
        "1 day ago": 1,
        "2 days ago": 2,
        "3 days ago": 3,
        "1 week ago": 7,
      };

      return (timeMap[a.posted] ?? 99) - (timeMap[b.posted] ?? 99);
    });

    // Enforce result limits based on tier
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