// app/api/username/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { keyword, platform, platformRules } = await req.json();

    const prompt = `
Generate 10 creative, modern, aesthetic, unique usernames for ${platform || 'general use'}.

Platform: ${platform}
Platform Rules: ${platformRules}

${keyword ? `Base keyword: "${keyword}"` : 'Use trending base words like: nova, zen, halo, echo, lunar, pixel, vibe, orbit, flare, phantom, cosmic, shadow'}

Style Requirements based on platform:
${platform === 'instagram' ? '- Use dots and underscores strategically\n- Keep it aesthetic and memorable\n- Mix of clean and stylized names' : ''}
${platform === 'twitter' ? '- Concise and professional\n- Avoid special characters\n- Easy to type and remember' : ''}
${platform === 'tiktok' ? '- Fun and trendy\n- Numbers work well (like 404, 777)\n- Creative combinations' : ''}
${platform === 'youtube' ? '- Brandable and searchable\n- Clean and simple\n- Easy to pronounce' : ''}
${platform === 'twitch' ? '- Gaming-focused terms\n- Edgy and memorable\n- Underscores allowed' : ''}
${platform === 'discord' ? '- Casual and friendly\n- Creative freedom\n- Can use most characters' : ''}
${platform === 'linkedin' ? '- Professional tone\n- Real name variations\n- Clean and simple' : ''}

General Mix (include variety):
- 3 clean simple names
- 2 aesthetic minimal names  
- 2 with strategic symbols (dots, underscores)
- 2 with stylistic variations
- 1 unique creative combination

Rules:
- Must look human-creative and trendy
- NOT random character spam
- Platform-appropriate
- Return ONLY the usernames
- One per line
- No numbering
- No explanations
- No markdown
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.9,
    });

    const text = completion.choices[0]?.message?.content || "";
    const names = text
      .split("\n")
      .map(n => n.trim())
      .filter(n => n.length > 0 && !n.match(/^\d+\./))
      .slice(0, 10);

    return NextResponse.json({ names });

  } catch (error) {
    console.error("Username API Error:", error);
    return NextResponse.json({ names: [] }, { status: 500 });
  }
}