'use client';

import { useState } from "react";

export default function TextSimplifierPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConvert() {
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
            content: `Rewrite this text into very simple language with numbered points:\n${input}`
          }
        ]
      })
    });

    const data = await response.json();
    setOutput(data.reply);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center px-4 py-6">

      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 mb-2">
        Simple Text Converter
      </h1>
      <p className="text-sm sm:text-base text-gray-700 text-center mb-6">
        Turn difficult text into easy-to-read numbered points.
      </p>

      {/* Input Card */}
      <div className="w-full max-w-3xl bg-white p-4 rounded-xl shadow">
        <textarea
          className="w-full p-3 border rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={6}
          placeholder="Enter text to simplify..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button
          onClick={handleConvert}
          className="mt-3 w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition"
        >
          {loading ? "Working..." : "Convert"}
        </button>
      </div>

      {/* Output Card */}
      {output && (
        <div className="w-full max-w-3xl mt-6 bg-white p-4 rounded-xl shadow text-sm sm:text-base whitespace-pre-line">
          {output}
        </div>
      )}
    </div>
  );
}
