import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // fast & cheap
    messages: [
      {
        role: "system",
        content:
          "You are SimpGPT. Always reply in simple, easy-to-understand words. Keep answers short and clear.",
      },
      ...messages,
    ],
  });

  return NextResponse.json({
    reply: completion.choices[0].message.content,
  });
}
