// app/api/username/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { keyword, platform, platformRules, gender, count = 10 } = await req.json();

    const platformSpecificRules = {
      linkedin: `
IMPORTANT: This is for LinkedIn - a PROFESSIONAL platform.
- Generate PROFESSIONAL, CAREER-ORIENTED usernames only
- Use formats like: FirstnameLastname, F.Lastname, FirstnameL, Firstname_Profession
- Examples: JohnSmith, J.Anderson, SarahTech, MikeConsultant, EmilyMarketing
- NO cute words, NO gaming terms, NO aesthetic symbols
- Keep it clean, simple, and business-appropriate
- Use real name patterns, job titles, or industry terms
`,
      instagram: `
For Instagram - aesthetic and trendy platform.
- Use aesthetic symbols like dots (.), underscores (_)
- Can be cute, trendy, stylish
- Mix of clean and creative styles
- Perfect for influencers and content creators
`,
      twitter: `
For Twitter/X - concise and witty platform.
- Keep it short and memorable
- Professional but creative
- Easy to type and remember
- Good for personal branding
`,
      tiktok: `
For TikTok - fun and trendy platform.
- Can include numbers (like 404, 777, 2k, 24)
- Trendy and catchy
- Gen-Z friendly vibes
- Perfect for viral content creators
`,
      youtube: `
For YouTube - content creator platform.
- Brandable and searchable
- Channel-name worthy
- Easy to pronounce and remember
- Good for building a following
`,
      twitch: `
For Twitch - gaming platform.
- Gaming-focused terms
- Can use underscores
- Edgy and memorable for streaming
- Perfect for gamers and streamers
`,
      discord: `
For Discord - community platform.
- Casual and friendly
- Creative freedom
- Community-oriented
- Perfect for server members
`,
      general: `
For general use across platforms.
- Universal appeal
- Works everywhere
- Versatile and memorable
`
    };

    const genderStyles = {
      boy: `
Cool, royal, classic, powerful masculine style using words like:
- Royal/Classic: king, prince, royal, duke, knight, legend, supreme, elite, crown, lord, baron, ace
- Strong/Edgy: alpha, ghost, shadow, storm, blade, titan, neo, venom, hawk, wolf, beast, savage, warrior, hunter
- Modern Cool: phantom, cosmic, neon, cyber, blaze, vortex, apex, sigma, ultra, quantum, nexus, void
`,
      girl: `
Cute, aesthetic, dreamy, elegant feminine style using words like:
- Cute/Sweet: cutie, angel, bunny, sweetie, dolly, cherry, honey, starlight, moonbeam
- Aesthetic: luna, rose, glow, bloom, bella, aurora, violet, pearl, star, celestial, aura, dreamy
- Elegant: crystal, diamond, grace, silk, velvet, blossom, butterfly, fairy, princess, jewel, opal
`
    };

    const prompt = `
You are a creative username generator.

${platformSpecificRules[platform as keyof typeof platformSpecificRules] || platformSpecificRules.general}

Generate ${count} unique, modern usernames.
${keyword ? `Base keyword: "${keyword}"` : 'Use trending base words based on the gender style'}

Gender Style: ${gender}
${genderStyles[gender as keyof typeof genderStyles]}

CRITICAL RULES - MUST FOLLOW:
1. Maximum 2 WORDS per username (can be combined or separated by symbols)
   ✅ GOOD: shadowking, royal_ace, luna.rose, knight24
   ❌ BAD: shadowkinglegend, royal_ace_supreme, luna.rose.fairy
   
2. NO emojis in usernames (❌ NO: 👑king, princess👧, wolf🐺)

3. NO repetitive patterns - make each username UNIQUE and DIFFERENT
   - Don't use same prefix/suffix repeatedly
   - Vary the structure and style
   - Mix different word combinations
   - Each username should feel completely different from others
   
4. Keep usernames between 6-16 characters when possible

5. For LinkedIn specifically:
   - Use ONLY professional formats
   - Real name patterns (JohnDoe, J.Smith, SarahM)
   - Or profession-based (TechJohn, MarketingSarah)
   - NO creative/aesthetic names for LinkedIn

Creativity rules (NOT for LinkedIn):
- Some with symbols: _ . x (examples: shadow_king, luna.xo, ace_24)
- Some with numbers: 24, 2k, 404, 777 (examples: phantom24, luna2k)
- Some with stylized letters: à ä ö ê (examples: lùna, rösé, phàntom)
- Some clean and simple (examples: shadow, luna, phantom)
- Mix different styles to keep variety

Style Distribution:
- 30% clean simple names
- 30% with symbols
- 20% with numbers
- 20% with stylized letters

Formatting rules:
- Each username on its own line
- No numbering
- No bullet points
- No explanations
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
      .filter(n => n.length > 0 && !n.match(/^\d+\./) && !n.includes('❌') && !n.includes('✅'))
      .slice(0, count);

    return NextResponse.json({ names });

  } catch (error) {
    console.error("Username API Error:", error);
    return NextResponse.json({ names: [] }, { status: 500 });
  }
}