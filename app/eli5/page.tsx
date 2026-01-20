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
        messages: [
          { role: "user", content: input }
        ]
      })
    });

    const data = await res.json();
    setOutput(data.reply);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        Explain Like I'm 5
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-xl flex gap-2">
        <input
          className="flex-1 border px-4 py-2 rounded"
          placeholder="Enter topic..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Explain
        </button>
      </form>

      {loading && <p className="mt-4">Thinking...</p>}

      {output && (
        <div className="mt-6 bg-white p-4 rounded shadow w-full max-w-xl whitespace-pre-line">
          {output}
        </div>
      )}
    </div>
  );
}
