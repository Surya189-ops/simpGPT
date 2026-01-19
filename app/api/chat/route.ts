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
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content: `
You are SimpGPT.

Explain topics in simple and clear language, but keep correct technical meaning.
Do not talk like a kids story. Do not oversimplify concepts.

Always format answers as numbered points.
Each sentence must start with a number and a dot.
Example:
1. First point
2. Second point

Do not add extra blank lines.
Do not use markdown or emojis.

Keep responses concise but informative.
Never exceed 500 words.
          `,
        },
        ...messages,
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I could not generate a response.";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
