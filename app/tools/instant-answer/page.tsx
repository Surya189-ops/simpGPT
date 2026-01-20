'use client';

import { useState } from "react";

export default function InstantAnswerPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Answer this question in simple language with numbered points:\n${question}`
          }
        ]
      })
    });

    const data = await response.json();
    setAnswer(data.reply);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center px-4 py-6">
      
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-green-700 mb-2">
        Instant Answer
      </h1>
      <p className="text-sm sm:text-base text-gray-700 text-center mb-6">
        Ask anything. Get a simple numbered answer instantly.
      </p>

      {/* Input */}
      <input
        className="w-full max-w-3xl p-3 border rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      {/* Button */}
      <button
        onClick={handleAsk}
        className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition"
      >
        {loading ? "Thinking..." : "Get Answer"}
      </button>

      {/* Output */}
      {answer && (
        <div className="w-full max-w-3xl mt-6 bg-white p-4 border rounded-lg shadow text-sm sm:text-base whitespace-pre-line">
          {answer}
        </div>
      )}
    </div>
  );
}
