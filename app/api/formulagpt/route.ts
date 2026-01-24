// app/api/formulagpt/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    let importantText = "";
    let allText = "";

    try {
      // Try OpenAI first
      console.log("Attempting to use OpenAI...");
      const [importantResponse, allResponse] = await Promise.all([
        generateWithOpenAI(importantPrompt, 1500),
        generateWithOpenAI(allPrompt, 1000)
      ]);
      importantText = importantResponse;
      allText = allResponse;
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
          const [importantResponse, allResponse] = await Promise.all([
            generateWithGemini(importantPrompt),
            generateWithGemini(allPrompt)
          ]);
          importantText = importantResponse;
          allText = allResponse;
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

    console.log(`Generated ${formulas.length} formulas with tricks, ${allFormulas.length} total formulas`);

    return NextResponse.json({ 
      formulas, 
      allFormulas
    });

  } catch (error: any) {
    console.error("FormulaGPT API Error:", error);
    return NextResponse.json({ 
      formulas: [], 
      allFormulas: [],
      error: error?.message || "Failed to generate formulas. Please try again."
    }, { status: 500 });
  }
}