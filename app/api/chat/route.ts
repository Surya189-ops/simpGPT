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
      max_tokens: 350, // keeps response safely under ~500 words
      messages: [
        {
          role: "system",
          content: `
You are SimpGPT.

Explain topics in simple and clear language, but keep correct technical meaning.
Do not talk like a kids story. Do not oversimplify concepts.

Always format answers as short readable lines.
Each idea should be on its own line.
Do not add empty blank lines.
Do not use markdown, symbols, emojis, or dashes.
Do not use bullet points.

If examples are needed, show them on separate lines.

Keep responses concise but informative.
Never exceed 500 words.
Avoid unnecessary filler sentences.
          `,
        },
        ...messages,
      ],
    });

    return NextResponse.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
