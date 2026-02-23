// lib/jobs/scoringEngine.ts
// Production-grade scoring and filtering engine
// Version 3.0 - With Relevance Explanation Engine

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

// ═══════════════════════════════════════════════════════════════════════════
// SKILL MATCHING V2 - Token-based with normalization
// ═══════════════════════════════════════════════════════════════════════════

function normalizeSkillToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/\.js$/i, "")
    .replace(/js$/i, "")
    .replace(/[^a-z0-9+#]/g, "")
    .trim();
}

function extractSkillTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[,\s\/\-|]+/)
    .map(normalizeSkillToken)
    .filter(t => t.length > 1);

  return new Set(tokens);
}

function isPartialMatch(skill: string, titleToken: string): boolean {
  if (skill === titleToken) return true;

  if (titleToken.includes(skill) || skill.includes(titleToken)) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    react: ["reactjs", "react"],
    angular: ["angularjs", "angular"],
    vue: ["vuejs", "vue"],
    node: ["nodejs", "node"],
    typescript: ["ts", "typescript"],
    javascript: ["js", "javascript"],
    python: ["py", "python"],
    mongodb: ["mongo", "mongodb"],
    postgresql: ["postgres", "postgresql"],
  };

  for (const [canonical, variants] of Object.entries(aliases)) {
    if (variants.includes(skill) && variants.includes(titleToken)) {
      return true;
    }
  }

  return false;
}

// Calculate skill match percentage (0-100) - 45% weight
export function calculateSkillMatch(jobTitle: string, userSkills: string): number {
  if (!userSkills || !userSkills.trim()) return 0;

  const titleTokens = extractSkillTokens(jobTitle);
  const skillTokens = extractSkillTokens(userSkills);

  if (skillTokens.size === 0) return 0;
  if (titleTokens.size === 0) return 0;

  let matchedCount = 0;
  for (const skill of skillTokens) {
    for (const titleToken of titleTokens) {
      if (isPartialMatch(skill, titleToken)) {
        matchedCount++;
        break;
      }
    }
  }

  const overlapPercentage = (matchedCount / skillTokens.size) * 100;
  const bonus = overlapPercentage > 75 ? 10 : overlapPercentage > 50 ? 5 : 0;

  return Math.min(100, Math.round(overlapPercentage + bonus));
}

// ═══════════════════════════════════════════════════════════════════════════
// TITLE SIMILARITY - 25% weight
// ═══════════════════════════════════════════════════════════════════════════

export function calculateTitleSimilarity(jobTitle: string, userRole: string): number {
  const titleLower = jobTitle.toLowerCase();
  const roleLower = userRole.toLowerCase();

  if (titleLower === roleLower) return 100;
  if (titleLower.includes(roleLower)) return 85;

  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
  const roleWords = roleLower.split(/\s+/).filter(w => w.length > 3);

  if (roleWords.length === 0) return 50;

  const matchedWords = roleWords.filter(word =>
    titleWords.some(tw => tw.includes(word) || word.includes(tw))
  );

  const wordOverlap = (matchedWords.length / roleWords.length) * 100;

  const keyRoleTerms = ["senior", "junior", "lead", "principal", "staff"];
  const hasRoleLevel = keyRoleTerms.some(term =>
    titleLower.includes(term) && roleLower.includes(term)
  );

  return Math.min(100, Math.round(wordOverlap + (hasRoleLevel ? 15 : 0)));
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCATION MATCHING - 15% weight
// ═══════════════════════════════════════════════════════════════════════════

export function calculateLocationMatch(jobLocation: string, userLocation: string): number {
  const jobLoc = jobLocation.toLowerCase();
  const userLoc = userLocation.toLowerCase();

  if (jobLoc === userLoc) return 100;

  if (userLoc === "remote" || userLoc.includes("remote")) {
    if (jobLoc.includes("remote")) return 100;
    return 30;
  }

  if (jobLoc.includes("remote")) {
    return 85;
  }

  const countryMatches: Record<string, string[]> = {
    india: ["india", "indian", "bangalore", "delhi", "mumbai", "hyderabad", "pune"],
    us: ["united states", "usa", "america", "san francisco", "new york", "seattle", "austin"],
    uk: ["united kingdom", "uk", "london", "manchester", "edinburgh"],
    europe: ["europe", "germany", "france", "netherlands", "spain", "italy"],
  };

  for (const [region, keywords] of Object.entries(countryMatches)) {
    const userInRegion = keywords.some(k => userLoc.includes(k));
    const jobInRegion = keywords.some(k => jobLoc.includes(k));
    if (userInRegion && jobInRegion) return 75;
  }

  if (jobLoc.includes(userLoc) || userLoc.includes(jobLoc)) return 60;

  return 15;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPERIENCE MATCHING - 10% weight
// ═══════════════════════════════════════════════════════════════════════════

export function calculateExperienceMatch(jobTitle: string, userExperience: string): number {
  if (!userExperience) return 50;

  const titleLower = jobTitle.toLowerCase();
  const expLower = userExperience.toLowerCase();

  if (expLower === "intern") {
    if (titleLower.includes("intern") || titleLower.includes("trainee")) return 100;
    if (titleLower.includes("senior") || titleLower.includes("lead")) return 0;
    return 40;
  }

  const experienceLevels: Record<string, string[]> = {
    "0-1": ["junior", "entry", "associate", "graduate"],
    "1-3": ["junior", "mid", "associate"],
    "3-5": ["mid", "senior", "intermediate"],
    "5+": ["senior", "lead", "principal", "staff", "architect"],
  };

  const levelKeywords = experienceLevels[expLower];
  if (!levelKeywords) return 50;

  if (["3-5", "5+"].includes(expLower)) {
    if (titleLower.includes("intern") || titleLower.includes("trainee")) return 0;
  }

  return levelKeywords.some(keyword => titleLower.includes(keyword)) ? 100 : 50;
}

// ═══════════════════════════════════════════════════════════════════════════
// FRESHNESS BOOST - 5% weight
// ═══════════════════════════════════════════════════════════════════════════

export function calculateFreshnessBoost(posted: string): number {
  const freshnessMap: Record<string, number> = {
    "Just now": 100,
    "1 day ago": 90,
    "2 days ago": 80,
    "3 days ago": 70,
    "1 week ago": 50,
  };

  return freshnessMap[posted] ?? 30;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WEIGHTED SCORING - DISTRIBUTION (45/25/15/10/5)
// ═══════════════════════════════════════════════════════════════════════════

export function calculateWeightedScore(
  job: Job,
  userRole: string,
  userSkills: string,
  userExperience: string,
  userLocation: string
): number {
  const skillMatch = calculateSkillMatch(job.title, userSkills);
  const titleSimilarity = calculateTitleSimilarity(job.title, userRole);
  const locationMatch = calculateLocationMatch(job.location, userLocation);
  const experienceMatch = calculateExperienceMatch(job.title, userExperience);
  const freshnessBoost = calculateFreshnessBoost(job.posted);

  let weightedScore =
    skillMatch * 0.45 +
    titleSimilarity * 0.25 +
    locationMatch * 0.15 +
    experienceMatch * 0.10 +
    freshnessBoost * 0.05;

  // Penalty 1: User provided skills BUT zero skill match
  if (userSkills && userSkills.trim() && skillMatch === 0) {
    weightedScore -= 15;
  }

  // Penalty 2: Very low title similarity
  if (titleSimilarity < 30) {
    weightedScore -= 10;
  }

  weightedScore = Math.max(0, weightedScore);
  weightedScore = Math.min(95, weightedScore);

  return Math.round(weightedScore);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVED DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

export function deduplicateJobs(jobs: Job[]): Job[] {
  const seen = new Map<string, Job>();

  for (const job of jobs) {
    const normalizedTitle = job.title
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const normalizedCompany = job.company
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim();

    const normalizedLocation = job.location
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim();

    const key = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
    const existing = seen.get(key);

    if (!existing || job.matchPercentage > existing.matchPercentage) {
      seen.set(key, job);
    }
  }

  return Array.from(seen.values());
}

// ═══════════════════════════════════════════════════════════════════════════
// STRICT RELEVANCE FILTERING
// ═══════════════════════════════════════════════════════════════════════════

export function filterIrrelevantJobs(
  jobs: Job[],
  userRole: string,
  userExperience: string
): Job[] {
  return jobs.filter(job => {
    const titleLower = job.title.toLowerCase();
    const roleLower = userRole.toLowerCase();

    const roleWords = roleLower.split(/\s+/).filter(w => w.length > 3);
    const hasAnyRoleWord = roleWords.some(word => titleLower.includes(word));

    if (!hasAnyRoleWord && job.matchPercentage < 40) {
      return false;
    }

    // HARD BLOCK: Experienced users
    if (userExperience === "5+" || userExperience === "3-5") {
      if (titleLower.includes("intern") || titleLower.includes("trainee")) {
        return false;
      }
    }

    // HARD BLOCK: Interns
    if (userExperience === "intern") {
      if (
        titleLower.includes("senior") ||
        titleLower.includes("lead") ||
        titleLower.includes("principal") ||
        titleLower.includes("staff") ||
        titleLower.includes("architect")
      ) {
        return false;
      }
    }

    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HARD MINIMUM THRESHOLD FILTER
// ═══════════════════════════════════════════════════════════════════════════

export function applyMinimumThreshold(jobs: Job[], threshold: number = 35): Job[] {
  return jobs.filter(job => job.matchPercentage >= threshold);
}

// ═══════════════════════════════════════════════════════════════════════════
// AI RANKING DECISION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

export function shouldUseAIRanking(
  skills: string,
  experience: string,
  jobs: Job[],
  isResumeSearch: boolean
): boolean {
  if (isResumeSearch) return true;
  if (skills?.trim() || experience?.trim()) return true;

  if (jobs.length > 0) {
    const scores = jobs.map(j => j.matchPercentage);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const variance = max - min;
    if (variance < 15) return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 RELEVANCE EXPLANATION ENGINE - Version 1.0
// Deterministic, no OpenAI, computed server-side
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get matched skill names with original casing preserved for display
 */
function getMatchedSkills(jobTitle: string, userSkills: string): string[] {
  if (!userSkills || !userSkills.trim()) return [];

  const titleTokens = extractSkillTokens(jobTitle);

  // Split original skills preserving casing for display
  const userSkillsArray = userSkills
    .split(/[,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const matched: string[] = [];

  for (const userSkill of userSkillsArray) {
    const normalizedUserSkill = normalizeSkillToken(userSkill);
    if (normalizedUserSkill.length < 1) continue;

    for (const titleToken of titleTokens) {
      if (isPartialMatch(normalizedUserSkill, titleToken)) {
        matched.push(userSkill);
        break;
      }
    }
  }

  return matched;
}

/**
 * Generate human-readable match reasons for a job
 * Fully deterministic - no external calls
 */
export function generateMatchReasons(
  job: Job,
  userRole: string,
  userSkills: string,
  userExperience: string,
  userLocation: string
): string[] {
  const reasons: string[] = [];

  // ─────────────────────────────────────────────
  // 1. SKILL REASONS
  // ─────────────────────────────────────────────
  if (userSkills && userSkills.trim()) {
    const matchedSkills = getMatchedSkills(job.title, userSkills);

    if (matchedSkills.length > 0) {
      const count = matchedSkills.length;
      const displaySkills = matchedSkills.slice(0, 3).join(", ");

      if (count === 1) {
        reasons.push(`Skill matched: ${displaySkills}`);
      } else if (count <= 3) {
        reasons.push(`${count} skills matched: ${displaySkills}`);
      } else {
        reasons.push(`${count} skills matched: ${displaySkills} +${count - 3} more`);
      }
    } else {
      reasons.push("No direct skill match");
    }
  }

  // ─────────────────────────────────────────────
  // 2. TITLE SIMILARITY REASON
  // ─────────────────────────────────────────────
  const titleSimilarity = calculateTitleSimilarity(job.title, userRole);

  if (titleSimilarity >= 85) {
    reasons.push("Strong role title match");
  } else if (titleSimilarity >= 70) {
    reasons.push("Good role title match");
  }

  // ─────────────────────────────────────────────
  // 3. EXPERIENCE REASON
  // ─────────────────────────────────────────────
  if (userExperience && userExperience.trim()) {
    const experienceMatch = calculateExperienceMatch(job.title, userExperience);

    if (experienceMatch === 100) {
      reasons.push("Matches your experience level");
    } else if (experienceMatch === 0) {
      reasons.push("Experience level differs");
    }
  }

  // ─────────────────────────────────────────────
  // 4. LOCATION REASON
  // ─────────────────────────────────────────────
  const locationMatch = calculateLocationMatch(job.location, userLocation);
  const jobLoc = job.location.toLowerCase();
  const userLoc = userLocation.toLowerCase();

  const isRemoteJob = jobLoc.includes("remote");
  const userWantsRemote = userLoc === "remote" || userLoc.includes("remote");

  if (isRemoteJob && userWantsRemote) {
    reasons.push("Remote opportunity");
  } else if (isRemoteJob) {
    reasons.push("Remote opportunity available");
  } else if (locationMatch === 100) {
    reasons.push("Exact location match");
  } else if (locationMatch >= 75) {
    reasons.push("Location matches your preference");
  }

  // ─────────────────────────────────────────────
  // 5. FRESHNESS REASON
  // ─────────────────────────────────────────────
  if (job.posted === "Just now" || job.posted === "1 day ago") {
    reasons.push("Recently posted");
  }

  return reasons;
}