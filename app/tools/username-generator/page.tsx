"use client";

import { useState } from "react";

const platforms = [
  "Instagram",
  "Twitter",
  "YouTube",
  "TikTok",
  "Reddit",
  "Snapchat",
  "Discord",
  "LinkedIn",
  "Gaming",
];

export default function UsernameGenerator() {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [results, setResults] = useState<string[]>([]);

  const generateUsernames = () => {
    if (!name.trim()) return;

    const base = name.replace(/\s+/g, "").toLowerCase();
    const suggestions = [];

    for (let i = 0; i < 10; i++) {
      const num = Math.floor(Math.random() * 999);
      const styles = [
        `${base}${num}`,
        `${base}_${num}`,
        `${platform.toLowerCase()}_${base}`,
        `${base}.${platform.toLowerCase()}`,
        `the_${base}`,
      ];
      suggestions.push(styles[Math.floor(Math.random() * styles.length)]);
    }

    setResults(suggestions);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-600">
          Username Generator
        </h1>

        <p className="text-sm text-gray-600 text-center mt-2">
          Generate unique usernames for any platform
        </p>

        <div className="mt-5 space-y-4">
          <input
            type="text"
            placeholder="Enter your name or keyword"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {platforms.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={generateUsernames}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Generate Usernames
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Suggestions
            </h2>

            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="border rounded-md px-3 py-2 text-sm bg-gray-50"
                >
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
