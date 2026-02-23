// app/api/formulagpt/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateWithOpenAI(prompt: string, maxTokens: number) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content || "";
}

async function generateWithGemini(prompt: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function POST(req: Request) {
  try {
    const { topic, subject, exam, subjectName, examName } = await req.json();

    // 🔐 AUTH & PREMIUM CHECK
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    let isPremium = false;
    let user: any = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");

      const {
        data: { user: authUser },
      } = await supabaseAdmin.auth.getUser(token);

      user = authUser;
    }

    // Check premium status if user is logged in
    if (user) {
      // Check premium status from Prisma User table
      const prismaUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: {
          subscriptionStatus: true,
          subscriptionEndDate: true,
        },
      });

      if (prismaUser?.subscriptionStatus === "active" && prismaUser.subscriptionEndDate) {
        const now = new Date();
        const expiry = new Date(prismaUser.subscriptionEndDate);

        if (expiry > now) {
          isPremium = true;
        } else {
          // Auto-expire premium
          await prisma.user.update({
            where: { email: user.email! },
            data: { subscriptionStatus: "inactive" },
          });
          isPremium = false;
        }
      }
    }

    // Generate Important Formulas with Tricks
    const importantPrompt = `
You are FormulaGPT, an expert academic formula provider for JEE, NEET, board exams, and general math and science.

Subject: ${subjectName}
Exam Level: ${examName}
Topic: ${topic}

Give 8-12 MOST IMPORTANT formulas for this topic.

CRITICAL FORMAT - MUST FOLLOW EXACTLY:
Each formula MUST be followed immediately by its memory trick.
Format:
1. [Formula]
Trick to remember: [Simple 1-2 line memory technique with real-life example]

2. [Formula]
Trick to remember: [Simple 1-2 line memory technique with real-life example]

EXAMPLE:
1. v = u + at
Trick to remember: Like a car accelerating on highway - your final speed = starting speed + how hard you push the gas (acceleration) over time

2. s = ut + 0.5at²
Trick to remember: Distance covered is like running at steady pace (ut) plus extra distance from speeding up (½at²) - imagine sprinting

3. (a + b)² = a² + 2ab + b²
Trick to remember: Think of a square garden with sides (a+b) - you get 4 sections: two squares (a², b²) and two rectangles (ab each)

4. PV = nRT
Trick to remember: Picture a balloon (P pushes out, V expands) - more gas (n) or heat (T) makes it bigger, like heating popcorn

RULES FOR TRICKS:
- Keep each trick 1-2 lines maximum
- Focus on HOW TO REMEMBER the formula using:
  * Real-life examples or analogies (e.g., "Like a car speeding up", "Think of a pizza being cut")
  * Mnemonic devices or word patterns (e.g., "SOH-CAH-TOA")
  * Visual imagery or stories (e.g., "Imagine a stretching rubber band")
  * Familiar everyday situations (sports, cooking, driving, etc.)
- Make it relatable and memorable
- NO technical explanations or derivations
- NO variable definitions (NO "where u is...")

RULES FOR FORMULAS:
1. Give 8-12 formulas
2. EVERY formula MUST have a trick on the next line
3. NO variable definitions anywhere
4. Number each formula (1. 2. 3.)
5. NO markdown formatting
6. Start each trick with "Trick to remember:"

Generate formulas with tricks now:
`;

  // Generate All Formulas (without tricks)
  const allPrompt = `
You are FormulaGPT, an expert academic formula provider.

Subject: ${subjectName}
Exam Level: ${examName}
Topic: ${topic}

Give ALL possible formulas for this topic (comprehensive list).

RULES:
1. List ALL formulas related to this topic (15-25 formulas)
2. Each formula on ONE line only
3. NO explanations, NO tricks, NO variable descriptions
4. Number each formula (1. 2. 3.)
5. Include basic, intermediate, and advanced formulas
6. Include derived formulas and special cases
7. NO markdown formatting

EXAMPLE FORMAT:
1. v = u + at
2. s = ut + 0.5at²
3. v² = u² + 2as

Generate ALL formulas now:
`;

  // Generate Decision Rules
  const decisionPrompt = `
You are FormulaGPT, an expert exam-oriented mentor for JEE, NEET, and board exams.

Subject: ${subjectName}
Exam Level: ${examName}
Topic: ${topic}

TASK:
Create an exam revision checklist showing WHEN to use WHICH formula.

CRITICAL RULES:
- NO warnings
- NO common confusions
- NO explanations like "This directly relates to..."
- NO theory or derivations
- NO variable definitions
- ONLY formula + exam triggers

OUTPUT FORMAT (STRICT):
Each rule must follow this EXACT structure:

1. <formula>
When to use:
<exam trigger line 1>
<exam trigger line 2>
<exam trigger line 3 if needed>

2. <formula>
When to use:
<exam trigger line 1>
<exam trigger line 2>
<exam trigger line 3 if needed>

WRITING "WHEN TO USE" SECTION:
- DO NOT start with "If"
- Write in exam-question language
- Each line should describe what the question gives or asks
- Expand the trigger with 2-3 clear lines
- Think: "What exactly does the question provide?"

GOOD EXAMPLES:

1. R = (u² sin2θ) / g
When to use:
Range and angle are given in the question.
Initial velocity is not directly provided.
Question focuses on horizontal distance only.

2. H = (u² sin²θ) / 2g
When to use:
Maximum height is directly asked.
Vertical motion part of projectile is involved.
Horizontal information is not required.

3. v = u + at
When to use:
Time is explicitly given in the question.
Final velocity is asked.
All other variables (u, a) are known or can be found.

4. v² = u² + 2as
When to use:
Time is NOT mentioned in the question.
Distance and velocities are given.
You need to eliminate the time variable completely.

BAD EXAMPLES (DO NOT DO THIS):
- Short vague one-liners
- Starting with "If..."
- Adding explanations like "This formula directly relates to..."
- Including warnings or confusions

FINAL CHECKLIST:
- Generate 6–8 rules maximum
- Each rule = formula + when to use (2-3 lines)
- NO extra text
- NO markdown formatting
- Keep it exam-focused and practical

Generate decision rules now:
`;

  let importantText = "";
  let allText = "";
  let decisionText = "";

  try {
    // Try OpenAI first
    console.log("Attempting to use OpenAI...");
    const [importantResponse, allResponse, decisionResponse] = await Promise.all([
      generateWithOpenAI(importantPrompt, 1500),
      generateWithOpenAI(allPrompt, 1000),
      generateWithOpenAI(decisionPrompt, 900)
    ]);
    importantText = importantResponse;
    allText = allResponse;
    decisionText = decisionResponse;
    console.log("OpenAI succeeded");
  } catch (openAIError: any) {
    // Check if it's a rate limit or quota error
    if (
      openAIError?.status === 429 ||
      openAIError?.code === 'insufficient_quota' ||
      openAIError?.message?.includes('quota') ||
      openAIError?.message?.includes('rate_limit')
    ) {
      console.log("OpenAI quota exhausted, switching to Gemini...");

      try {
        // Fallback to Gemini
        const [importantResponse, allResponse, decisionResponse] = await Promise.all([
          generateWithGemini(importantPrompt),
          generateWithGemini(allPrompt),
          generateWithGemini(decisionPrompt)
        ]);
        importantText = importantResponse;
        allText = allResponse;
        decisionText = decisionResponse;
        console.log("Gemini succeeded");
      } catch (geminiError) {
        console.error("Gemini also failed:", geminiError);
        throw new Error("Both OpenAI and Gemini failed. Please try again later.");
      }
    } else {
      // If it's not a quota error, throw the original error
      throw openAIError;
    }
  }

  // Parse Important Formulas with Tricks
  const importantLines = importantText.split("\n").map(line => line.trim()).filter(line => line.length > 0);

  let formulas = [];

  for (let i = 0; i < importantLines.length; i++) {
    const line = importantLines[i];

    // Check if line starts with a number (formula line)
    if (/^\d+\./.test(line)) {
      const formula = line.replace(/^\d+\.\s*/, '');

      // Look for trick in next few lines
      let trick = '';
      for (let j = i + 1; j < Math.min(i + 4, importantLines.length); j++) {
        const nextLine = importantLines[j];

        // Check if this line contains a trick
        if (nextLine.toLowerCase().includes('trick') ||
          nextLine.toLowerCase().includes('remember') ||
          nextLine.includes('💡')) {
          trick = nextLine
            .replace(/^(💡\s*)?trick to remember:\s*/i, '')
            .replace(/^trick:\s*/i, '')
            .replace(/^remember:\s*/i, '')
            .trim();
          i = j; // Skip to this line
          break;
        }

        // If we hit another numbered formula, stop looking
        if (/^\d+\./.test(nextLine)) {
          i = j - 1; // Go back one so we don't skip the next formula
          break;
        }

        // If it's not a trick indicator and not a formula, it might be the trick itself
        if (!(/^\d+\./.test(nextLine)) && nextLine.length > 10) {
          trick = nextLine.trim();
          i = j;
          break;
        }
      }

      formulas.push({ formula, trick });
    }
  }

  // Fallback: If no tricks were found at all, try simpler parsing
  if (formulas.length > 0 && formulas.every(f => !f.trick)) {
    console.log("No tricks found with complex parsing, trying simple approach...");
    formulas = [];

    for (let i = 0; i < importantLines.length; i++) {
      const line = importantLines[i];
      if (/^\d+\./.test(line)) {
        const formula = line.replace(/^\d+\.\s*/, '');
        const nextLine = i + 1 < importantLines.length ? importantLines[i + 1] : '';

        // If next line doesn't start with a number, it's probably the trick
        const trick = nextLine && !(/^\d+\./.test(nextLine))
          ? nextLine
            .replace(/^(💡\s*)?trick to remember:\s*/i, '')
            .replace(/^trick:\s*/i, '')
            .trim()
          : '';

        formulas.push({ formula, trick });
        if (trick && nextLine) i++; // Skip the trick line
      }
    }
  }

  // Parse All Formulas (without tricks)
  const allFormulas = allText
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && /^\d+\./.test(line))
    .map(line => line.replace(/^\d+\.\s*/, ''));

  // Parse Decision Rules - NEW SIMPLIFIED PARSING
  const decisionLines = decisionText.split("\n").map(line => line.trim()).filter(line => line.length > 0);

  let decisionRules = [];

  for (let i = 0; i < decisionLines.length; i++) {
    const line = decisionLines[i];

    // Check if line starts with a number (formula line)
    if (/^\d+\./.test(line)) {
      const formula = line.replace(/^\d+\.\s*/, '');
      let whenToUseLines = [];

      // Look for "When to use:" and collect the trigger lines
      for (let j = i + 1; j < decisionLines.length; j++) {
        const nextLine = decisionLines[j];

        // Stop if we hit another numbered formula
        if (/^\d+\./.test(nextLine)) {
          i = j - 1;
          break;
        }

        // Skip the "When to use:" header line
        if (nextLine.toLowerCase().includes('when to use:')) {
          continue;
        }

        // Collect trigger lines
        if (nextLine.length > 10 && !nextLine.toLowerCase().includes('when to use:')) {
          whenToUseLines.push(nextLine);
        }
      }

      // Join all trigger lines into one condition
      if (whenToUseLines.length > 0) {
        const condition = whenToUseLines.join(' ');
        decisionRules.push({
          condition,
          formula,
          reason: '' // Not used in new format
        });
      }
    }
  }

  console.log(`Generated ${formulas.length} formulas with tricks, ${allFormulas.length} total formulas, ${decisionRules.length} decision rules`);

  return NextResponse.json({
    formulas,
    allFormulas,
    decisionRules: isPremium ? decisionRules : []
  });


} catch (error: any) {
  console.error("FormulaGPT API Error:", error);
  return NextResponse.json({
    formulas: [],
    allFormulas: [],
    decisionRules: [],
    error: error?.message || "Failed to generate formulas. Please try again."
  }, { status: 500 });
}
}