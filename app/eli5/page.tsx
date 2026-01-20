'use client';

import { useState } from "react";

export default function Eli5Page() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setOutput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "eli5",
        messages: [{ role: "user", content: input }]
      })
    });

    const data = await res.json();
    setOutput(data.reply);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 p-6">

      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full text-center">

        <h1 className="text-3xl font-extrabold text-gray-800">
          TinyBrain Explainer
        </h1>

        <p className="text-gray-500 mt-2">
          Understand anything in super simple words
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
          <input
            className="flex-1 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Type any topic..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"
          >
            Explain
          </button>
        </form>

        {loading && (
          <p className="mt-4 text-gray-500">Thinking...</p>
        )}

        {output && (
          <div className="mt-6 bg-gray-50 border rounded-lg p-4 text-left whitespace-pre-line text-gray-800">
            {output}
          </div>
        )}
      </div>

    </div>
  );
}
