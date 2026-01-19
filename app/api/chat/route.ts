import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `
You are SimpGPT.

Explain topics clearly and simply, but keep correct technical meaning.
Do not talk like a kids story. Do not oversimplify.

Always format the final answer as numbered lines.
Each line must start with a number followed by a dot and a space.
Example:
1. First point
2. Second point
3. Third point

Do not use bullet points, markdown, emojis, or extra blank lines.
Do not put two points on the same line.

Keep responses concise but informative.
Never exceed 500 words.
Avoid filler sentences.
          `,
        },
        ...messages,
      ],
    });

    return NextResponse.json({
      reply: completion.choices[0].message.content.trim(),
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
