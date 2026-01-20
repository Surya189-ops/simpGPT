import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, mode } = body;

    let systemPrompt = `
You are SimpGPT.
Explain topics in simple clear language.
Always answer in short numbered lines.
Do not use emojis or markdown.
`;

    if (mode === "eli5") {
      systemPrompt = `
You explain any topic like speaking to a 5 year old child.
Use very simple words.
Always reply in short numbered lines.
No emojis. No markdown.
`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 300,
    });

    const reply = completion.choices[0].message.content || "No response";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { reply: "Something went wrong" },
      { status: 500 }
    );
  }
}
