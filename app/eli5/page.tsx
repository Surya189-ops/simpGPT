'use client';

import { useState } from "react";

export default function Eli5Page() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSimplify() {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Explain this in very simple and clear way with numbered points:\n${input}`
          }
        ]
      })
    });

    const data = await response.json();
    setOutput(data.reply);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-6">
      
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
        Smart Explainer
      </h1>
      <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
        Paste any complex text. Get simple numbered explanations.
      </p>

      {/* Input Box */}
      <textarea
        className="w-full max-w-3xl p-3 border rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={6}
        placeholder="Paste complex text here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {/* Button */}
      <button
        onClick={handleSimplify}
        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
      >
        {loading ? "Simplifying..." : "Simplify"}
      </button>

      {/* Output */}
      {output && (
        <div className="w-full max-w-3xl mt-6 bg-white p-4 border rounded-lg shadow text-sm sm:text-base whitespace-pre-line">
          {output}
        </div>
      )}
    </div>
  );
}
