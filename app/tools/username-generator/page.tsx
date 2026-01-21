// app/tools/username-generator/page.tsx
"use client";

import { useState } from "react";

const socialMediaPlatforms = [
  { 
    id: "instagram", 
    name: "Instagram", 
    icon: "💎", 
    gradient: "from-purple-500 via-pink-500 to-orange-500",
    rules: "Short, aesthetic, memorable. Can use dots and underscores."
  },
  { 
    id: "twitter", 
    name: "Twitter/X", 
    icon: "𝕏", 
    gradient: "from-blue-400 via-blue-500 to-blue-600",
    rules: "Concise, witty, professional. Avoid special characters."
  },
  { 
    id: "tiktok", 
    name: "TikTok", 
    icon: "🎵", 
    gradient: "from-cyan-400 via-pink-500 to-purple-600",
    rules: "Fun, trendy, creative. Numbers and dots work well."
  },
  { 
    id: "youtube", 
    name: "YouTube", 
    icon: "▶️", 
    gradient: "from-red-500 to-red-700",
    rules: "Brandable, memorable, searchable. Keep it simple."
  },
  { 
    id: "twitch", 
    name: "Twitch", 
    icon: "🎮", 
    gradient: "from-purple-600 to-purple-800",
    rules: "Gaming-focused, edgy, memorable. Underscores allowed."
  },
  { 
    id: "discord", 
    name: "Discord", 
    icon: "💬", 
    gradient: "from-indigo-500 to-indigo-700",
    rules: "Casual, friendly, creative. Most characters allowed."
  },
  { 
    id: "linkedin", 
    name: "LinkedIn", 
    icon: "💼", 
    gradient: "from-blue-600 to-blue-800",
    rules: "Professional, real name based, clean and simple."
  },
  { 
    id: "general", 
    name: "General", 
    icon: "✨", 
    gradient: "from-gray-700 to-gray-900",
    rules: "Universal style that works across all platforms."
  },
];

export default function UsernameGenerator() {
  const [keyword, setKeyword] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [selectedGender, setSelectedGender] = useState<"boy" | "girl">("boy");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showPlatforms, setShowPlatforms] = useState(true);

  async function generateUsernames(isLoadMore = false) {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setNames([]);
    }

    const platform = socialMediaPlatforms.find(p => p.id === selectedPlatform);

    const res = await fetch("/api/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        keyword,
        platform: selectedPlatform,
        platformRules: platform?.rules,
        gender: selectedGender,
        count: isLoadMore ? 5 : 10
      }),
    });

    const data = await res.json();
    
    if (isLoadMore) {
      setNames(prev => [...prev, ...(data.names || [])]);
      setLoadingMore(false);
    } else {
      setNames(data.names || []);
      setLoading(false);
      setShowPlatforms(false);
    }
  }

  function copyName(name: string, index: number) {
    navigator.clipboard.writeText(name);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  const selectedPlatformData = socialMediaPlatforms.find(p => p.id === selectedPlatform);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="bg-white/95 backdrop-blur-lg shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Username Generator
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Create aesthetic, modern, unique usernames for social media
          </p>
        </div>

        {/* Platform Selection */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs sm:text-sm font-semibold text-gray-700">
              Select Platform
            </label>
            {!showPlatforms && names.length > 0 && (
              <button
                onClick={() => setShowPlatforms(!showPlatforms)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-all transform hover:scale-105 active:scale-95"
              >
                Change
              </button>
            )}
          </div>
          
          {showPlatforms && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {socialMediaPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`relative group overflow-hidden rounded-xl p-3 sm:p-4 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    selectedPlatform === platform.id
                      ? 'ring-4 ring-purple-500 shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${platform.gradient} opacity-90`}></div>
                  <div className="relative">
                    <div className="text-3xl sm:text-4xl mb-1">{platform.icon}</div>
                    <div className="text-white text-[10px] sm:text-xs font-semibold leading-tight">
                      {platform.name}
                    </div>
                  </div>
                  {selectedPlatform === platform.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedPlatformData && (
            <div className={`bg-gradient-to-r ${selectedPlatformData.gradient} p-3 sm:p-4 rounded-xl text-white text-xs sm:text-sm mb-4`}>
              <div className="flex items-start gap-2">
                <span className="text-2xl sm:text-3xl flex-shrink-0">{selectedPlatformData.icon}</span>
                <div>
                  <div className="font-bold mb-1">{selectedPlatformData.name}</div>
                  <div className="text-white/90 text-[10px] sm:text-xs leading-relaxed">
                    {selectedPlatformData.rules}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Keyword Input with Gender Selection */}
        <div className="mb-4">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
            Keyword (Optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2 justify-center sm:justify-start">
              <button
                onClick={() => setSelectedGender("boy")}
                className={`flex-1 sm:flex-none px-6 sm:px-8 py-2.5 rounded-xl text-2xl transition-all ${
                  selectedGender === "boy"
                    ? 'bg-blue-500 shadow-lg ring-4 ring-blue-200 scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                }`}
                title="Boy"
              >
                👦
              </button>
              <button
                onClick={() => setSelectedGender("girl")}
                className={`flex-1 sm:flex-none px-6 sm:px-8 py-2.5 rounded-xl text-2xl transition-all ${
                  selectedGender === "girl"
                    ? 'bg-pink-500 shadow-lg ring-4 ring-pink-200 scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                }`}
                title="Girl"
              >
                👧
              </button>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={() => generateUsernames(false)}
          disabled={loading}
          className={`w-full bg-gradient-to-r ${selectedPlatformData?.gradient} text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2 sm:gap-3">
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl sm:text-2xl">{selectedPlatformData?.icon}</span>
              <span className="truncate">
                {keyword.trim() ? "Generate Usernames" : "Generate Random"}
              </span>
            </span>
          )}
        </button>

        {/* Results */}
        {names.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Generated Usernames
              </h2>
              <span className="text-xs sm:text-sm text-gray-500">{names.length} results</span>
            </div>
            
            <div className="space-y-2 max-h-[50vh] sm:max-h-96 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {names.map((name, i) => (
                <div
                  key={i}
                  className="group flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-pink-50 border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 hover:shadow-md hover:border-purple-300"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <span className="text-gray-400 text-xs sm:text-sm font-mono w-5 sm:w-6 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-gray-800 font-semibold text-sm sm:text-base truncate">
                      {name}
                    </span>
                  </div>
                  <button
                    onClick={() => copyName(name, i)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex-shrink-0 ml-2 ${
                      copiedIndex === i
                        ? 'bg-green-500 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700 sm:opacity-0 sm:group-hover:opacity-100'
                    }`}
                  >
                    {copiedIndex === i ? '✓' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            <button
              onClick={() => generateUsernames(true)}
              disabled={loadingMore}
              className="w-full mt-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading More...
                </span>
              ) : (
                '+ Load More (5)'
              )}
            </button>

            <button
              onClick={() => {
                setNames([]);
                setShowPlatforms(true);
                setKeyword("");
              }}
              className="w-full mt-3 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all active:scale-95"
            >
              Generate New Batch
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        @media (min-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #a855f7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9333ea;
        }
      `}</style>
    </div>
  );
}