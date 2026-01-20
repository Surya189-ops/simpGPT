'use client';

import { useState } from "react";

const platforms = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Twitter (X)",
  "Facebook",
  "Snapchat",
  "Discord",
  "Reddit",
  "Twitch",
  "Pinterest",
  "LinkedIn",
  "Gaming",
  "Blog / Website",
  "Personal Brand"
];

export default function UsernameGeneratorPage() {
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateUsernames() {
    if (!keyword.trim()) return;
    setLoading(true);
    setResult("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `
Generate 20 unique ${platform} username ideas using this keyword: ${keyword}.
Rules:
Return answers as numbered list.
No emojis.
Keep names short.
Mix numbers or underscores if helpful.
Make them creative and brandable.
`
          }
        ]
      })
    });

    const data = await response.json();
    setResult(data.reply);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-purple-50 flex flex-col items-center px-4 py-6">

      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 mb-2 text-center">
        Social Username Generator
      </h1>
      <p className="text-sm sm:text-base text-gray-700 text-center mb-6 max-w-xl">
        Generate unique usernames for Instagram, TikTok, YouTube, Discord, Gaming and more.
      </p>

      {/* Input */}
      <input
        className="w-full max-w-3xl p-3 border rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Enter name or keyword..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      {/* Platform Select */}
      <select
        className="w-full max-w-3xl mt-3 p-3 border rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
      >
        {platforms.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>

      {/* Button */}
      <button
        onClick={generateUsernames}
        className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition w-full max-w-xs"
      >
        {loading ? "Generating..." : "Generate Usernames"}
      </button>

      {/* Output */}
      {result && (
        <div className="w-full max-w-3xl mt-6 bg-white p-4 border rounded-lg shadow text-sm sm:text-base whitespace-pre-line">
          {result}
        </div>
      )}
    </div>
  );
}
