'use client';

import { useState } from "react";

export default function TextSimplifier() {
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
            content: `Simplify this text in easy words:\n${input}`
          }
        ]
      })
    });

    const data = await response.json();
    setOutput(data.reply);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      
      {/* SEO Title Section */}
      <h1 className="text-3xl font-bold text-blue-600 mb-2">
        Text Simplifier Tool
      </h1>
      <p className="text-gray-600 mb-6 text-center max-w-xl">
        Paste any text and convert it into simple, easy-to-understand language.
      </p>

      {/* Input */}
      <textarea
        className="w-full max-w-2xl border rounded-lg p-3 h-40 mb-4"
        placeholder="Paste your text here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleSimplify}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg mb-6"
        disabled={loading}
      >
        {loading ? "Simplifying..." : "Simplify Text"}
      </button>

      {/* Output */}
      {output && (
        <div className="w-full max-w-2xl bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Simplified Text:</h2>
          <p className="whitespace-pre-line text-gray-800">{output}</p>
        </div>
      )}

      {/* Link back to main chat */}
      <a
        href="/"
        className="mt-6 text-blue-600 underline"
      >
        Try full SimpGPT Chat →
      </a>
    </div>
  );
}
