// lib/jobs/mockJobGenerator.ts
// Realistic mock job generation with role-to-company mapping

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

// Role category detection patterns
const ROLE_CATEGORIES = {
  tech: [
    "developer", "engineer", "programmer", "software", "frontend", "backend",
    "fullstack", "devops", "sre", "architect", "qa", "tester", "react",
    "angular", "vue", "node", "python", "java", "golang", "rust"
  ],
  data: [
    "data", "analyst", "analytics", "scientist", "ml", "ai", "machine learning",
    "deep learning", "statistician", "bi", "business intelligence"
  ],
  design: [
    "designer", "ux", "ui", "graphic", "product design", "visual", "figma",
    "sketch", "illustrator", "photoshop"
  ],
  marketing: [
    "marketing", "seo", "sem", "content", "social media", "growth",
    "performance marketing", "digital marketing", "brand"
  ],
  sales: [
    "sales", "account", "business development", "bd", "partnership",
    "revenue", "enterprise sales"
  ],
  fitness: [
    "trainer", "fitness", "gym", "yoga", "coach", "personal training",
    "physiotherapy", "sports", "wellness"
  ],
  creative: [
    "video", "editor", "content creator", "videographer", "photographer",
    "animator", "motion graphics", "producer", "director"
  ],
  finance: [
    "finance", "accounting", "accountant", "auditor", "financial analyst",
    "investment", "banking", "wealth management"
  ],
  hr: [
    "hr", "human resource", "recruiter", "talent", "people ops",
    "hiring", "recruitment"
  ],
  operations: [
    "operations", "ops", "supply chain", "logistics", "operations manager",
    "project manager", "scrum master", "agile"
  ],
};

// Company pools by category
const COMPANY_POOLS = {
  tech: [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Adobe",
    "Salesforce", "Oracle", "IBM", "Intel", "Cisco", "VMware", "Stripe",
    "Shopify", "Zoom", "Atlassian", "GitHub", "GitLab", "Vercel"
  ],
  techIndia: [
    "TCS", "Infosys", "Wipro", "HCL", "Tech Mahindra", "Cognizant",
    "Mindtree", "Mphasis", "LTI", "Capgemini India"
  ],
  startups: [
    "Uber", "Airbnb", "Spotify", "Notion", "Figma", "Linear", "Supabase",
    "Vercel", "Retool", "Zapier", "Airtable", "Miro"
  ],
  data: [
    "Palantir", "Snowflake", "Databricks", "Tableau", "Looker", "Segment",
    "Amplitude", "Mixpanel", "Datadog", "Splunk"
  ],
  design: [
    "Figma", "Adobe", "Canva", "InVision", "Sketch", "Framer", "Webflow",
    "IDEO", "Frog Design", "Pentagram"
  ],
  marketing: [
    "HubSpot", "Mailchimp", "SEMrush", "Moz", "Buffer", "Hootsuite",
    "Sprout Social", "Marketo", "Pardot", "ActiveCampaign"
  ],
  sales: [
    "Salesforce", "HubSpot", "Gong", "Outreach", "SalesLoft", "ZoomInfo",
    "Apollo", "LinkedIn Sales Navigator", "Pipedrive", "Freshsales"
  ],
  fitness: [
    "Gold's Gym", "Cult.fit", "Anytime Fitness", "Planet Fitness",
    "Equinox", "CrossFit", "F45", "Orangetheory", "Fitness First",
    "Talwalkars", "Snap Fitness"
  ],
  creative: [
    "Adobe", "Netflix", "Disney", "Warner Bros", "Universal", "Sony Pictures",
    "Red Chillies", "Dharma Productions", "Yash Raj Films", "Balaji Telefilms",
    "The Viral Fever", "FilterCopy", "Being Indian"
  ],
  finance: [
    "Goldman Sachs", "JPMorgan", "Morgan Stanley", "Citi", "HSBC",
    "Deloitte", "PwC", "EY", "KPMG", "Accenture"
  ],
  hr: [
    "LinkedIn", "Indeed", "Workday", "ADP", "Lever", "Greenhouse",
    "BambooHR", "Gusto", "Rippling", "Personio"
  ],
  operations: [
    "Amazon", "FedEx", "DHL", "UPS", "Walmart", "Target", "Flipkart",
    "Zomato", "Swiggy", "Blinkit", "Zepto"
  ],
  generic: [
    "Accenture", "Deloitte", "PwC", "EY", "KPMG", "Capgemini",
    "IBM", "Wipro", "TCS", "Infosys"
  ],
};

// Detect role category
function detectRoleCategory(jobRole: string): string {
  const roleLower = jobRole.toLowerCase();

  for (const [category, keywords] of Object.entries(ROLE_CATEGORIES)) {
    if (keywords.some(keyword => roleLower.includes(keyword))) {
      return category;
    }
  }

  return "generic";
}

// Get realistic companies for role
function getRelevantCompanies(
  jobRole: string,
  location: string,
  count: number = 15
): string[] {
  const category = detectRoleCategory(jobRole);
  let pool: string[] = [];

  // Select company pool based on category and location
  if (category === "tech") {
    pool = location === "india"
      ? [...COMPANY_POOLS.techIndia, ...COMPANY_POOLS.tech, ...COMPANY_POOLS.startups]
      : [...COMPANY_POOLS.tech, ...COMPANY_POOLS.startups];
  } else if (COMPANY_POOLS[category as keyof typeof COMPANY_POOLS]) {
    pool = COMPANY_POOLS[category as keyof typeof COMPANY_POOLS];
  } else {
    pool = COMPANY_POOLS.generic;
  }

  // Mix with some generic companies for variety
  if (pool.length < count && category !== "generic") {
    pool = [...pool, ...COMPANY_POOLS.generic];
  }

  // Shuffle and return subset
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

// Role variations
export function getRoleVariations(role: string, experience?: string): string[] {
  const normalizedRole = role.toLowerCase();

  // Intern mode
  if (experience === "intern") {
    return [
      `${role} Intern`,
      `${role} Internship`,
      `Intern - ${role}`,
      `Graduate Intern ${role}`,
      `${role} Trainee`,
    ];
  }

  // Role-specific variations
  const variations: Record<string, string[]> = {
    "gym trainer": ["Gym Trainer", "Fitness Trainer", "Personal Trainer"],
    "video editor": ["Video Editor", "Content Editor", "Reels Editor", "Post-Production Editor"],
    "data analyst": ["Data Analyst", "Business Analyst", "Analytics Specialist"],
    "frontend developer": ["Frontend Developer", "React Developer", "UI Developer", "Frontend Engineer"],
    "backend developer": ["Backend Developer", "Backend Engineer", "API Developer", "Server-Side Developer"],
    "fullstack developer": ["Fullstack Developer", "Full Stack Engineer", "MERN Stack Developer"],
  };

  return variations[normalizedRole] || [role];
}

// Generate realistic mock jobs
export function generateRealisticMockJobs(
  jobRole: string,
  location: string,
  selectedSite: string,
  skills: string,
  experience: string,
  isPro: boolean,
  locationJobSites: Record<string, string[]>
): Job[] {
  const jobTypes = ["Full-time", "Contract", "Part-time", "Remote"];
  const timePosted = ["Just now", "1 day ago", "2 days ago", "3 days ago", "1 week ago"];

  const sitesToUse = selectedSite === "all"
    ? locationJobSites[location] || ["linkedin", "indeed", "glassdoor"]
    : [selectedSite];

  const numJobs = isPro ? 25 : 12;
  const roleVariants = getRoleVariations(jobRole, experience);

  // Get realistic companies
  const relevantCompanies = getRelevantCompanies(jobRole, location, numJobs);

  const locationName =
    location === "remote" ? "Remote" :
    location === "us" ? "United States" :
    location === "india" ? "India" :
    location === "uk" ? "United Kingdom" : "Europe";

  const jobs: Job[] = [];

  for (let i = 0; i < numJobs; i++) {
    const company = relevantCompanies[i % relevantCompanies.length];
    const site = sitesToUse[i % sitesToUse.length];
    const finalRole = roleVariants[i % roleVariants.length];
    const posted = timePosted[Math.floor(Math.random() * timePosted.length)];

    jobs.push({
      id: `job-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: finalRole,
      company,
      location: locationName,
      source: site,
      matchPercentage: 0, // Will be calculated by scoring engine
      posted,
      type: jobTypes[Math.floor(Math.random() * jobTypes.length)],
    });
  }

  return jobs;
}