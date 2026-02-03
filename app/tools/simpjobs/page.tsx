// app/tools/simpjobs/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
const STARTER_LIMIT = 50;



const locations = [
  { id: "us", name: "United States", flag: "🇺🇸" },
  { id: "india", name: "India", flag: "🇮🇳" },
  { id: "uk", name: "United Kingdom", flag: "🇬🇧" },
  { id: "europe", name: "Europe", flag: "🇪🇺" },
  { id: "remote", name: "Remote", flag: "🌍" },
];


// Helper function to generate job site search URLs
function getApplyLink(job: Job): string {
  const role = encodeURIComponent(job.title.replace(/ - .*/, ""));
  const location = encodeURIComponent(job.location);

  switch (job.source.toLowerCase()) {
    case "wellfound":
      return `https://wellfound.com/jobs?query=${role}`;

    case "linkedin":
      return `https://www.linkedin.com/jobs/search/?keywords=${role}&location=${location}`;
    case "indeed":
      return `https://www.indeed.com/jobs?q=${role}&l=${location}`;
    case "naukri":
      return `https://www.naukri.com/${role.replace(/%20/g, "-")}-jobs-in-${location.replace(/%20/g, "-")}`;
    case "glassdoor":
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${role}&locT=C&locKeyword=${location}`;
    case "remote":
      return `https://remote.co/remote-jobs/search/?search_keywords=${role}`;
    default:
      return `https://www.google.com/search?q=${role}+jobs+${location}`;
  }
}

function formatSourceName(source: string) {
  return source.charAt(0).toUpperCase() + source.slice(1);
}


export default function SimpJobs() {
  const { data: session, status, update } = useSession();
  const [jobRole, setJobRole] = useState("");
  const [location, setLocation] = useState("us");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [selectedSite, setSelectedSite] = useState("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const GUEST_SEARCH_LIMIT = 2;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeView, setActiveView] = useState<"search" | "saved" | "resume">("search");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [country, setCountry] = useState<"IN" | "GLOBAL">("GLOBAL");
  const [countryLoaded, setCountryLoaded] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState("");

  const jobSites = useMemo(() => {
    return [
      { id: "all", name: "All Sites", icon: "🌐" },
      { id: "linkedin", name: "LinkedIn", icon: "💼" },
      { id: "indeed", name: "Indeed", icon: "📋" },

      ...(country === "IN"
        ? [{ id: "naukri", name: "Naukri", icon: "🇮🇳" }]
        : [{ id: "wellfound", name: "Wellfound", icon: "🚀" }]),

      { id: "glassdoor", name: "Glassdoor", icon: "🏢" },
      { id: "remote", name: "Remote Jobs", icon: "🌍" },
    ];
  }, [country]);


  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        if (data?.country_code === "IN") {
          setCountry("IN");
        } else {
          setCountry("GLOBAL");
        }
      })
      .finally(() => {
        setCountryLoaded(true);
      });
  }, []);
  // Registration form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const isLoggedIn = status === "authenticated";
  const subscriptionTier =
    (session?.user?.subscriptionTier as "free" | "starter" | "pro") || "free";

  const isPro = subscriptionTier === "pro" || subscriptionTier === "starter";

  const FREE_SAVE_LIMIT = 5;


  useEffect(() => {
    if (!isLoggedIn) {
      const count = localStorage.getItem("searchCount");
      setSearchCount(count ? parseInt(count) : 0);
      return;
    }

    if (session?.user?.searchCount !== undefined) {
      setSearchCount(session.user.searchCount as number);
    }
  }, [isLoggedIn, session]);




  useEffect(() => {
    async function loadSavedJobs() {
      // 👤 LOGGED-IN → fetch from DB
      if (isLoggedIn) {
        try {
          const res = await fetch("/api/simpjobs/save");
          const data = await res.json();
          setSavedJobs(data.jobs || []);
        } catch {
          setSavedJobs([]);
        }
      } else {
        // 👤 GUEST → localStorage
        const storedJobs = localStorage.getItem("savedJobs");
        if (storedJobs) {
          try {
            setSavedJobs(JSON.parse(storedJobs));
          } catch {
            setSavedJobs([]);
          }
        }
      }
    }

    loadSavedJobs();
  }, [isLoggedIn]);

  // Fetch resume data on mount
  useEffect(() => {
    async function loadResumeData() {
      if (!isLoggedIn || !isPro) return;

      try {
        const res = await fetch("/api/simpjobs/resume");
        const data = await res.json();
        if (data.resumeData) {
          setResumeData(data.resumeData);
          setCustomLocation(data.resumeData.location || "");
        }
      } catch (error) {
        console.error("Failed to load resume:", error);
      }
    }

    loadResumeData();
  }, [isLoggedIn, isPro]);



  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Registration failed");
        return;
      }

      // Auto login after registration
      const result = await signIn("credentials", {
        email: registerData.email,
        password: registerData.password,
        redirect: false,
      });

      if (result?.ok) {
        setShowRegisterModal(false);
        setRegisterData({ name: "", email: "", password: "" });
      } else {
        alert("Registration successful! Please login.");
        setShowRegisterModal(false);
        setShowLoginModal(true);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Something went wrong. Please try again.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const result = await signIn("credentials", {
      email: loginData.email,
      password: loginData.password,
      redirect: false,
    });

    if (result?.ok) {
      localStorage.removeItem("searchCount");
      localStorage.removeItem("savedJobs");
      setShowLoginModal(false);
      setLoginData({ email: "", password: "" });
    }
    else {
      alert("Invalid email or password");
    }
  }

  async function handleGoogleLogin() {
    localStorage.removeItem("searchCount");
    localStorage.removeItem("savedJobs");
    await signIn("google", { callbackUrl: "/tools/simpjobs" });
  }


  async function handleUpgrade(planName: "starter" | "pro") {
    if (!isLoggedIn) {
      setShowUpgradeModal(false);
      setShowLoginModal(true);
      return;
    }

    // 🌍 Block global users (Stripe not live yet)
    if (country !== "IN") {
      alert("Global payments coming soon 🚀");
      return;
    }

    setCheckoutLoading(true);

    try {

      const amount =
        planName === "starter"
          ? 199 * 100
          : 399 * 100;


      // starter = ₹299, pro = $19 equivalent (adjust later)

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, planName }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: "INR",
        name: "SimpJobs",
        description: `${planName.toUpperCase()} Plan`,
        order_id: data.orderId,
        handler: async function (response: any) {
          await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planName,
            }),
          });

          alert("Payment successful 🎉");

          // refresh session (gets new subscriptionTier)
          await update();

          // close modal + unlock UI instantly
          setShowUpgradeModal(false);



        },
        theme: { color: "#2563eb" },
      };

      if (!window.Razorpay) {
        alert("Payment system not loaded. Please refresh and try again.");
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Payment failed");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or DOCX file");
      return;
    }

    setResumeUploading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("/api/simpjobs/resume", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "UPGRADE_REQUIRED") {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(data.error || "Upload failed");
      }

      setResumeData(data.parsed);
      setCustomLocation(data.parsed.location || "");
      setEditingLocation(false);

      alert("Resume uploaded successfully! 🎉");
    } catch (error: any) {
      console.error("Resume upload error:", error);
      alert(error.message || "Failed to upload resume");
    } finally {
      setResumeUploading(false);
    }
  }

  async function searchWithResume() {
    if (!resumeData) {
      alert("Please upload a resume first");
      return;
    }

    if (!customLocation && !resumeData.location) {
      alert("Please enter a preferred location");
      return;
    }


    setLoading(true);
    setJobs([]);

    try {
      const response = await fetch("/api/simpjobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobRole: resumeData.role || "Software Developer",
          location: customLocation || resumeData.location || "us",
          experience: resumeData.experience || "",
          skills: resumeData.skills?.join(", ") || "",
          selectedSite: "all",
          country,
          useResume: true,
        }),
      });

      const data = await response.json();

      if (response.status === 403) {
        setShowUpgradeModal(true);
        return;
      }

      setJobs(data.jobs);
      setActiveView("search");
    } catch (error) {
      console.error("Resume search error:", error);
      alert("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }


  async function searchJobs() {

    // 🚫 Block ONLY on 3rd guest attempt
    if (!isLoggedIn && searchCount >= GUEST_SEARCH_LIMIT) {
      setShowLoginModal(true);
      return;
    }

    // 🚫 Block logged-in FREE users ONLY on 6th attempt
    if (
      isLoggedIn &&
      subscriptionTier === "free" &&
      searchCount >= 5
    ) {
      setShowUpgradeModal(true);
      return;
    }



    if (!jobRole.trim()) {
      alert("Please enter a job role");
      return;
    }


    setLoading(true);
    setJobs([]);

    try {
      const response = await fetch("/api/simpjobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobRole,
          location,
          experience,
          skills,
          selectedSite,
          country, // 👈 VERY IMPORTANT
        }),

      });

      if (response.status === 403 || response.status === 429) {
        setShowUpgradeModal(true);
        return;
      }

      const data = await response.json();

      // ✅ show results ALWAYS on first guest search
      // 🚫 Invalid / nonsense query
      if (data?.emptyReason === "invalid_query") {
        setJobs([]);
        alert("Please enter a valid job role like 'Frontend Developer' or 'Data Analyst'");
        return;
      }

      // ✅ Normal results
      setJobs(data.jobs);


      if (isLoggedIn && data?.meta?.searchCount !== undefined) {
        setSearchCount(data.meta.searchCount);
      } else {
        // 👤 Guest → increment AFTER showing results
        const newCount = searchCount + 1;
        setSearchCount(newCount);
        localStorage.setItem("searchCount", newCount.toString());

      }

    } catch (error) {
      console.error("Search error:", error);
      alert("Search temporarily unavailable.");
    } finally {
      setLoading(false);
    }

  }



  async function saveJob(job: Job) {
    const exists = savedJobs.some(j => j.id === job.id);

    // 🔒 FREE PLAN LIMIT
    if (!exists && !isPro && savedJobs.length >= FREE_SAVE_LIMIT) {
      setShowUpgradeModal(true);
      return;
    }

    // 👤 LOGGED-IN → DB
    if (isLoggedIn) {
      try {
        const res = await fetch("/api/simpjobs/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job }),
        });

        const data = await res.json();

        // toggle UI
        const updated = data.saved
          ? [...savedJobs, job]
          : savedJobs.filter(j => j.id !== job.id);

        setSavedJobs(updated);
      } catch {
        alert("Failed to save job");
      }
      return;
    }

    // 👤 GUEST → localStorage save
    const updated = exists
      ? savedJobs.filter(j => j.id !== job.id)
      : [...savedJobs, job];

    setSavedJobs(updated);
    localStorage.setItem("savedJobs", JSON.stringify(updated));
    return;


  }


  if (!countryLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Detecting location…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-2xl sm:text-3xl">💼</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                SimpJobs
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-200">by SimpGPT</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isLoggedIn ? (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      setShowLoginModal(true);
                    } else {
                      setShowUpgradeModal(true);
                    }
                  }}

                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-lg hover:shadow-lg transition-all"
                >
                  <span className="hidden sm:inline">Upgrade to </span>Pro
                </button>
              </>
            ) : (
              <>
                <div className="text-xs sm:text-sm text-white flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        setShowLoginModal(true);
                      } else {
                        setShowUpgradeModal(true);
                      }
                    }}

                    className={`px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm cursor-pointer
                      ${subscriptionTier === "free"
                        ? "bg-gray-500 text-white"
                        : subscriptionTier === "starter"
                          ? "bg-blue-500 text-white"
                          : "bg-green-500 text-white"
                      }`}
                  >
                    {subscriptionTier.toUpperCase()}
                  </button>

                  <button
                    onClick={() => signOut()}
                    className="px-2 sm:px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-xs sm:text-sm"
                  >
                    Logout
                  </button>
                </div>

              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 sm:mb-3 leading-tight">
            Find Better Jobs Faster
          </h2>
          <p className="text-base sm:text-xl text-blue-200 mb-4 sm:mb-6 px-2">
            Stop searching everywhere. Get direct job links from top sites.
          </p>

          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full text-white text-xs sm:text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>

            {/* 👤 GUEST */}
            {!isLoggedIn && (
              <span>
                {searchCount >= GUEST_SEARCH_LIMIT
                  ? "Login to continue searching"
                  : `${GUEST_SEARCH_LIMIT - searchCount} / ${GUEST_SEARCH_LIMIT} free searches left`}
              </span>
            )}

            {/* 👤 LOGGED-IN FREE */}
            {isLoggedIn && subscriptionTier === "free" && (
              <span>
                {Math.max(0, 5 - searchCount)} / 5 searches left
              </span>
            )}

            {/* ⭐ STARTER */}
            {subscriptionTier === "starter" && (
              <span>
                {searchCount} / {STARTER_LIMIT} searches used
              </span>
            )}

            {/* 🚀 PRO */}
            {subscriptionTier === "pro" && (
              <span>
                Unlimited searches
              </span>
            )}
          </div>

        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-4 sm:mb-6 max-w-4xl mx-auto">
          <button
            onClick={() => setActiveView("search")}
            className={`flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all ${activeView === "search"
              ? "bg-white text-blue-900 shadow-lg"
              : "bg-white/10 text-white hover:bg-white/20"
              }`}
          >
            🔍 Search Jobs
          </button>
          <button
            onClick={() => setActiveView("saved")}
            className={`flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all ${activeView === "saved"
              ? "bg-white text-blue-900 shadow-lg"
              : "bg-white/10 text-white hover:bg-white/20"
              }`}
          >
            💾 Saved ({savedJobs.length})
          </button>
          <button
            onClick={() => {
              if (!isPro) {
                setShowUpgradeModal(true);
                return;
              }
              setActiveView("resume");
            }}
            className={`flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all relative ${activeView === "resume"
              ? "bg-white text-blue-900 shadow-lg"
              : "bg-white/10 text-white hover:bg-white/20"
              } ${!isPro ? "opacity-60" : ""}`}
          >
            📄 Resume Match
            {!isPro && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                PRO
              </span>
            )}
          </button>
        </div>

        {activeView === "search" ? (
          <>
            {/* Search Form */}
            <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl mb-6 sm:mb-8">
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                {/* Job Role */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Job Role *
                  </label>
                  <input
                    type="text"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g., Frontend Developer, Data Analyst"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchJobs();
                      }
                    }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {locations.slice(0, 3).map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setLocation(loc.id)}
                        className={`p-2 sm:p-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${location === loc.id
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        <div className="text-base sm:text-lg mb-0.5 sm:mb-1">{loc.flag}</div>
                        <div className="text-[10px] sm:text-xs leading-tight">{loc.name.split(' ')[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Experience (Optional)
                  </label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Any</option>
                    <option value="intern">Intern / Internship</option>
                    <option value="0-1">0–1 years</option>
                    <option value="1-3">1–3 years</option>
                    <option value="3-5">3–5 years</option>
                    <option value="5+">5+ years</option>

                  </select>
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Skills (Optional)
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="React, Python, AWS..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Job Sites */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                  Search On (Optional)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {jobSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedSite(site.id)}
                      className={`p-2 sm:p-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${selectedSite === site.id
                        ? "bg-blue-600 text-white shadow-lg ring-2 sm:ring-4 ring-blue-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{site.icon}</div>
                      <div className="text-[10px] sm:text-xs leading-tight">{site.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={searchJobs}
                disabled={
                  loading ||
                  !jobRole.trim() ||
                  (!isLoggedIn && searchCount >= GUEST_SEARCH_LIMIT) ||
                  (isLoggedIn && subscriptionTier === "free" && searchCount >= 6)
                }
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2 sm:gap-3">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Finding Jobs...
                  </span>
                ) : (
                  "Find Jobs"
                )}
              </button>

              {!isLoggedIn && (
                <p className="mt-2 text-xs text-center text-gray-600">
                  Guest users get limited searches. Login for more.
                </p>

              )}



              {!isPro && (
                <p className="text-xs text-center text-gray-500 mt-3">
                  Powered by SimpGPT
                </p>
              )}
            </div>

            {/* Results */}
            {jobs.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Found {jobs.length} Jobs
                  </h3>
                  {!isPro && (
                    <button
                      onClick={() => {
                        if (!isLoggedIn) {
                          setShowLoginModal(true);
                        } else {
                          setShowUpgradeModal(true);
                        }
                      }}

                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg transition-all"
                    >
                      See All
                    </button>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white/95 backdrop-blur-lg rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-200 hover:border-blue-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                            {job.title}
                          </h4>
                          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              🏢 <span className="truncate">{job.company}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              📍 {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              🌐 {job.source}
                            </span>
                            <span className="flex items-center gap-1">
                              🕐 {job.posted}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => saveJob(job)}
                          className={`p-2 rounded-lg transition-all flex-shrink-0 ml-2 ${savedJobs.some(j => j.id === job.id)
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                        >
                          {savedJobs.some(j => j.id === job.id) ? "⭐" : "☆"}
                        </button>
                      </div>

                      {/* Match Percentage */}
                      <div className="mb-4">
                        {job.matchReasons && job.matchReasons.length > 0 && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-bold text-blue-700">🧠 Resume Match</span>
                            </div>
                            <ul className="text-xs text-gray-700 space-y-1">
                              {job.matchReasons.map((reason: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-green-500">•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-xs sm:text-sm font-semibold text-blue-600">
                            {job.matchPercentage}% Match
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${job.matchPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          Based on your {job.matchReasons ? "resume" : "skills and experience"}
                        </p>
                      </div>

                      {/* Apply Button */}
                      <a
                        href={getApplyLink(job)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!isLoggedIn) {
                            e.preventDefault();
                            setShowLoginModal(true);
                          }
                        }}
                        className="block w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center text-sm sm:text-base font-bold rounded-lg hover:shadow-lg transition-all"
                      >
                        {isLoggedIn
                          ? `View on ${formatSourceName(job.source)} →`
                          : "Login to view job →"}
                      </a>

                    </div>
                  ))}
                </div>

                {!isPro && jobs.length > 0 && (
                  <div className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      💡 Want better matches?
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload your resume and let AI find jobs that perfectly match your skills
                    </p>
                    <button
                      onClick={() => {
                        setShowUpgradeModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                    >
                      Upgrade to Use Resume Match
                    </button>
                  </div>
                )}

                {!isPro && (
                  <div className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl text-center">
                    <h4 className="text-xl sm:text-2xl font-black text-black mb-2">
                      Want to see more jobs?
                    </h4>
                    <p className="text-sm sm:text-base text-black/80 mb-4">
                      Upgrade to Pro for unlimited searches and results
                    </p>
                    <button
                      onClick={() => {
                        if (!isLoggedIn) {
                          setShowLoginModal(true);
                        } else {
                          setShowUpgradeModal(true);
                        }
                      }}

                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-lg text-sm sm:text-base font-bold hover:bg-gray-900 transition-all"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                )}
              </div>
            )}
            {!loading && jobs.length === 0 && (
              <div className="max-w-2xl mx-auto text-center mt-10 bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  No jobs found
                </h3>
                <p className="text-sm sm:text-base text-blue-200">
                  Try searching for a clearer role like{" "}
                  <span className="font-semibold text-white">Frontend Developer</span>,{" "}
                  <span className="font-semibold text-white">Data Analyst</span>, or{" "}
                  <span className="font-semibold text-white">Software Engineer</span>.
                </p>
              </div>
            )}

          </>
        ) : activeView === "saved" ? (
          // Saved Jobs View
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
              Saved Jobs ({savedJobs.length})
            </h3>

            {savedJobs.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 sm:p-12 text-center">
                <div className="text-5xl sm:text-6xl mb-4">💼</div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
                  No saved jobs yet
                </h4>
                <p className="text-sm sm:text-base text-blue-200 mb-4">
                  Save jobs to access them quickly later
                </p>
                <button
                  onClick={() => setActiveView("search")}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-blue-900 rounded-lg text-sm sm:text-base font-semibold hover:shadow-lg transition-all"
                >
                  Start Searching
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {savedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white/95 backdrop-blur-lg rounded-xl p-4 sm:p-6 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                          {job.title}
                        </h4>
                        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-3">
                          <span>🏢 {job.company}</span>
                          <span>📍 {job.location}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => saveJob(job)}
                        className="p-2 bg-yellow-100 text-yellow-600 rounded-lg flex-shrink-0 ml-2"
                      >
                        ⭐
                      </button>
                    </div>

                    {/* Apply Button */}
                    <a
                      href={getApplyLink(job)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          e.preventDefault();
                          setShowLoginModal(true);
                        }
                      }}
                      className="block w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center text-sm sm:text-base font-bold rounded-lg hover:shadow-lg transition-all"
                    >
                      {isLoggedIn
                        ? `View on ${formatSourceName(job.source)} →`
                        : "Login to view job →"}
                    </a>

                  </div>
                ))}
              </div>

            )}
          </div>
        ) : (
          // Resume Match View
          <div className="max-w-4xl mx-auto">
            {!resumeData ? (
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 sm:p-8">
                <div className="text-center mb-8">
                  <div className="text-5xl sm:text-6xl mb-4">📄</div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
                    Resume-Based Job Matching
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-6">
                    Upload your resume and we will:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mb-8 text-left max-w-2xl mx-auto">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Understand your skills & experience</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Match you with best-fit jobs</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Rank jobs based on resume relevance</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Avoid irrelevant listings</span>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-all">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    disabled={resumeUploading}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className={`cursor-pointer ${resumeUploading ? "opacity-50" : ""}`}
                  >
                    {resumeUploading ? (
                      <div>
                        <div className="text-4xl mb-4">⏳</div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                          Reading your resume…
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• Extracting skills</p>
                          <p>• Understanding experience</p>
                          <p>• Finding best matches</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-5xl mb-4">📤</div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                          Upload Your Resume
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Drag & drop or click to browse
                        </p>
                        <p className="text-xs text-gray-500">
                          Supports PDF and DOCX (Max 5MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <p className="text-xs text-center text-gray-500 mt-4">
                  🔒 Your resume is private and not shared with anyone
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resume Summary */}
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                        Your Resume Profile
                      </h3>
                      <p className="text-sm text-gray-600">
                        AI-understood summary from your resume
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        document.getElementById("resume-upload")?.click();
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all"
                    >
                      Update Resume
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="text-xs font-bold text-blue-600 mb-1">ROLE</div>
                      <div className="text-base font-semibold text-gray-900">
                        {resumeData.role || "Not specified"}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="text-xs font-bold text-green-600 mb-1">EXPERIENCE</div>
                      <div className="text-base font-semibold text-gray-900">
                        {resumeData.experience || "Not specified"}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 md:col-span-2">
                      <div className="text-xs font-bold text-purple-600 mb-2">TOP SKILLS</div>
                      <div className="flex flex-wrap gap-2">
                        {resumeData.skills?.map((skill: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700"
                          >
                            {skill}
                          </span>
                        )) || <span className="text-gray-500">No skills found</span>}
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4 md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-bold text-orange-600">
                          PREFERRED LOCATION
                        </div>
                        <button
                          onClick={() => {
                            if (editingLocation) {
                              setCustomLocation(customLocation.trim());
                              setEditingLocation(false);
                            } else {
                              setEditingLocation(true);
                            }
                          }}

                          className="px-2 py-1 bg-white rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                        >
                          {editingLocation ? "Save" : "Edit"}
                        </button>
                      </div>
                      {editingLocation ? (
                        <input
                          type="text"
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          placeholder="e.g., San Francisco, Remote, India"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <>
                          <div className="text-base font-semibold text-gray-900">
                            {customLocation || resumeData.location || "Not specified"}
                          </div>

                          {customLocation && customLocation !== resumeData.location && (
                            <div className="mt-1 text-xs text-orange-600 font-medium">
                              Using custom location
                            </div>
                          )}
                        </>
                      )}

                    </div>
                  </div>

                  <button
                    onClick={searchWithResume}
                    disabled={loading}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? "Finding Jobs..." : "Find Jobs Based on Resume"}
                  </button>

                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    disabled={resumeUploading}
                    className="hidden"
                    id="resume-upload"
                  />
                </div>

                {/* Promotion */}
                {jobs.length === 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8 text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      Ready to find your perfect job?
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Click the button above to get personalized job recommendations
                      based on your resume
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12 border-t border-white/10">
        <div className="text-center">
          <p className="text-sm sm:text-base text-blue-200 mb-2">
            Need help or have questions?
          </p>
          <a
            href="mailto:support@simpjobs.in"
            className="text-base sm:text-lg font-semibold text-white hover:text-blue-300 transition-colors"
          >
            support@simpjobs.in
          </a>
          <p className="text-xs sm:text-sm text-blue-200/70 mt-2">
            We usually reply within 24 hours.
          </p>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl sm:text-5xl mb-4">💼</div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                Welcome Back!
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                You've reached the free search limit.
                Create an account to unlock more searches and save jobs.
              </p>

            </div>

            <form onSubmit={handleLogin} className="space-y-3 mb-6">
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Log In
              </button>
            </form>

            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold rounded-xl hover:bg-gray-50 transition-all mb-4 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="text-center">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setShowRegisterModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                Don't have an account? Sign up
              </button>
            </div>

            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm sm:text-base font-semibold mt-4"
            >
              Continue as Guest
            </button>

            <p className="text-xs text-center text-gray-500 mt-4">
              Trouble signing in? Contact{" "}
              <a
                href="mailto:support@simpjobs.in"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                support@simpjobs.in
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl sm:text-5xl mb-4">🚀</div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                Create Account
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Start finding better jobs today
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Full Name"
                value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                required
                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="Password (min. 6 characters)"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Create Account
              </button>
            </form>

            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold rounded-xl hover:bg-gray-50 transition-all mb-4 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>

            <div className="text-center">
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setShowLoginModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                Already have an account? Log in
              </button>
            </div>

            <button
              onClick={() => setShowRegisterModal(false)}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm sm:text-base font-semibold mt-4"
            >
              Cancel
            </button>

            <p className="text-xs text-center text-gray-500 mt-4">
              Trouble signing in? Contact{" "}
              <a
                href="mailto:support@simpjobs.in"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                support@simpjobs.in
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl my-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-4xl sm:text-5xl mb-4">🚀</div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                Upgrade to SimpJobs Pro
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Most users get interviews within 2–3 weeks of consistent use
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6 sm:mb-8">
              {/* Starter Plan */}
              <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 hover:border-blue-500 transition-all">
                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Starter</h4>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                  {country === "IN" ? "₹199" : "$4"}
                  <span className="text-xs sm:text-sm text-gray-500 font-normal">/month</span>
                </div>

                <ul className="space-y-2 mb-4 sm:mb-6 text-xs sm:text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>50 searches/day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>20 results per search</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Save unlimited jobs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="font-semibold">Resume-based job matching (NEW)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Email alerts</span>
                  </li>
                </ul>
                <button
                  onClick={() => {
                    if (country !== "IN") {
                      alert("We'll notify you when global payments go live 🚀");
                      return;
                    }
                    handleUpgrade("starter");
                  }}

                  disabled={checkoutLoading}
                  className="w-full py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {checkoutLoading
                    ? "Loading..."
                    : country === "IN"
                      ? "Choose Starter"
                      : "Notify Me"}

                </button>
              </div>

              {/* Pro Plan */}
              <div className="border-2 border-blue-500 rounded-xl p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Pro</h4>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                  {country === "IN" ? "₹399" : "$19"}
                  <span className="text-xs sm:text-sm text-gray-500 font-normal">/month</span>
                </div>

                <ul className="space-y-2 mb-4 sm:mb-6 text-xs sm:text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="font-semibold">Unlimited searches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="font-semibold">50+ results per search</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="font-semibold">Resume-based job matching (NEW)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Priority fresh jobs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Advanced filters</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Faster results</span>
                  </li>
                </ul>
                <button
                  onClick={() => {
                    if (country !== "IN") {
                      alert("We'll notify you when global payments go live 🚀");
                      return;
                    }
                    handleUpgrade("pro");
                  }}

                  disabled={checkoutLoading}
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {checkoutLoading
                    ? "Loading..."
                    : country === "IN"
                      ? "Choose Pro"
                      : "Notify Me"}

                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-center text-gray-600 mb-4">
              Have questions before upgrading? Contact{" "}
              <a
                href="mailto:support@simpjobs.in"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                support@simpjobs.in
              </a>
            </p>

            <button
              onClick={() => setShowUpgradeModal(false)}
              disabled={checkoutLoading}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm sm:text-base font-semibold"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}