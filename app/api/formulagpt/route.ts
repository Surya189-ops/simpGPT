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

    const isMathematics = subject === "mathematics";

    // Generate Important Formulas
    const importantPrompt = isMathematics ? `
You are FormulaGPT, an expert mathematics formula provider.

Subject: ${subjectName}
Exam Level: ${examName}
Topic: ${topic}

Give the MOST IMPORTANT mathematics formulas for this topic.

CRITICAL: For Mathematics, give ONLY formulas, NO explanations, NO variable descriptions.

FORMAT:
1. Formula only (one line)
2. Formula only (one line)
3. Formula only (one line)

EXAMPLE:
1. (a + b)² = a² + 2ab + b²
2. (a - b)² = a² - 2ab + b²
3. a² - b² = (a + b)(a - b)

RULES:
1. Give 10-15 MOST IMPORTANT formulas only
2. Each formula on ONE line only
3. NO explanations, NO "where", NO variable descriptions
4. Number each formula (1. 2. 3.)
5. ONLY pure formulas
6. NO markdown formatting

Generate formulas now:
` : `
You are FormulaGPT, an expert academic formula provider for JEE, NEET, board exams, and general math and science.

Subject: ${subjectName}
Exam Level: ${examName}
Topic: ${topic}

Your job is to give the MOST IMPORTANT formulas with clear explanations.

FORMAT - MUST FOLLOW EXACTLY:
For each formula, provide TWO lines:
Line 1: The formula itself (clean, no explanations)
Line 2: where [explain each variable clearly]

EXAMPLE:
v = u + at
where v is final velocity, u is initial velocity, a is acceleration, t is time

s = ut + 0.5at²
where s is displacement, u is initial velocity, t is time, a is acceleration

RULES:
1. Give 8-12 MOST IMPORTANT formulas only
2. Each formula must have TWO lines: formula then explanation
3. Use "where" to start the explanation line
4. Number each formula (1. 2. 3.)
5. Keep explanations simple and student-friendly
6. NO markdown, NO bullets, NO fancy formatting
7. Focus on exam-critical formulas only

Generate the most important formulas now:
`;

    // Generate All Formulas without Explanations
    const allPrompt = `
You are FormulaGPT, an expert academic formula provider.

Subject: ${subjectName}
Exam Level: ${examName}
Topic: ${topic}

Give ALL possible formulas for this topic (comprehensive list).

RULES:
1. List ALL formulas related to this topic (15-25 formulas)
2. Each formula on ONE line only
3. NO explanations, NO variable descriptions
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
        generateWithOpenAI(importantPrompt, 1000),
        generateWithOpenAI(allPrompt, 800)
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

    const importantLines = importantText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    
    let formulas = [];

    if (isMathematics) {
      // For Mathematics: No explanations, just formulas
      formulas = importantLines
        .filter(line => /^\d+\./.test(line))
        .map(line => ({
          formula: line.replace(/^\d+\.\s*/, ''),
          explanation: ''
        }));
    } else {
      // For other subjects: Include explanations
      for (let i = 0; i < importantLines.length; i++) {
        const line = importantLines[i];
        if (/^\d+\./.test(line)) {
          const formula = line.replace(/^\d+\.\s*/, '');
          const nextLine = importantLines[i + 1];
          const explanation = nextLine && nextLine.toLowerCase().startsWith('where') 
            ? nextLine.replace(/^where\s*/i, '')
            : '';
          
          formulas.push({ formula, explanation });
          if (explanation) i++; // Skip the explanation line in next iteration
        }
      }
    }

    // Parse All Formulas (without explanations)
    const allFormulas = allText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0 && /^\d+\./.test(line))
      .map(line => line.replace(/^\d+\.\s*/, ''));

    return NextResponse.json({ formulas, allFormulas });

  } catch (error: any) {
    console.error("FormulaGPT API Error:", error);
    return NextResponse.json({ 
      formulas: [], 
      allFormulas: [],
      error: error?.message || "Failed to generate formulas. Please try again."
    }, { status: 500 });
  }
}