// app/api/username/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { keyword, platform, platformRules, gender, count = 10 } = await req.json();

    const genderStyles = {
      boy: `
Cool, royal, classic, powerful masculine style using words like:
- Royal/Classic: king, prince, royal, duke, knight, legend, supreme, elite, crown, throne
- Strong/Edgy: alpha, ghost, shadow, storm, blade, titan, neo, venom, ace, hawk, wolf, beast, savage, warrior
- Modern Cool: phantom, cosmic, neon, cyber, blaze, vortex, matrix, apex, sigma, ultra
Include strong, powerful, masculine, trendy vibes.
`,
      girl: `
Cute, aesthetic, dreamy, elegant feminine style using words like:
- Cute/Sweet: cutie, angel, bunny, sweetie, baby, dolly, cherry, peach, honey, sugar
- Aesthetic: luna, rose, pastel, glow, halo, bloom, heart, bella, aurora, violet, pearl, star, moon, sky
- Elegant: crystal, diamond, sapphire, grace, silk, velvet, blossom, butterfly, fairy, princess
Include soft, dreamy, cute, aesthetic, feminine vibes.
`,
      unisex: `
Trendy unisex style using words like: vibe, aura, nova, echo, zen, wave, pixel, cosmic, neon, cyber, dream, soul, sky, orbit, flux, nexus, prism, twilight.
Include neutral, modern, trendy vibes.
`
    };

    const prompt = `
You are a creative username generator.
The user may provide a keyword. Generate ${count} unique, modern, and attractive usernames based on that keyword.
If no keyword is provided, generate ${count} random trending usernames.

Platform: ${platform}
Platform Rules: ${platformRules}
Gender Style: ${gender}

${keyword ? `Base keyword: "${keyword}"` : 'Use trending base words based on the gender style'}

${genderStyles[gender as keyof typeof genderStyles]}

Creativity rules:
- Some usernames include symbols like @ _ . x
- Some usernames include stylized letters like à ä ö ê û ñ
- Some merge syllables smoothly
- Some look minimal and clean
- Some look gamer or edgy
- Some look soft or dreamy
- Mix different styles to create variety

Constraints:
- No username longer than 20 characters
- Avoid repeating the same pattern
- All usernames must feel social-media ready
- Make them trendy and modern

Formatting rules:
- Each username must be on its own line
- Do not add numbering
- Do not add bullet points
- Do not add explanations
- Only output usernames
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: count === 5 ? 150 : 250,
      temperature: 0.9,
    });

    const text = completion.choices[0]?.message?.content || "";
    const names = text
      .split("\n")
      .map(n => n.trim())
      .filter(n => n.length > 0 && !n.match(/^\d+\./))
      .slice(0, count);

    return NextResponse.json({ names });

  } catch (error) {
    console.error("Username API Error:", error);
    return NextResponse.json({ names: [] }, { status: 500 });
  }
}