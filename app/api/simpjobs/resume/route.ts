// app/api/simpjobs/resume/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";


// Helper to extract text from PDF
async function parseResumeFromPDFWithAI(buffer: Buffer) {
  const base64 = buffer.toString("base64");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a resume parser.
The user will give you a BASE64-ENCODED PDF file.
Extract resume information from it.

Return ONLY valid JSON:
{
  "role": "job title",
  "experience": "experience level",
  "skills": ["skill1", "skill2"],
  "location": "preferred location",
  "keywords": ["keyword1", "keyword2"]
}`,
      },
      {
        role: "user",
        content: `Here is the resume PDF in base64:\n\n${base64.slice(0, 12000)}`,
      },
    ],
  });

  const raw = completion.choices[0].message.content || "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}




// Helper to extract text from DOCX
async function extractTextFromDOCX() {
  throw new Error("DOCX upload not supported yet");
}


// Parse resume with OpenAI
async function parseResumeWithAI(text: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a resume parser. Extract key information from resumes.
Return ONLY valid JSON with this structure:
{
  "role": "Current or desired job title",
  "experience": "Years of experience (e.g., '3-5 years', '0-1 years', 'Entry level')",
  "skills": ["skill1", "skill2", "skill3"],
  "location": "Preferred location if mentioned, otherwise 'Not specified'",
  "keywords": ["keyword1", "keyword2"]
}

Be concise. Extract only the most relevant information.`,
        },
        {
          role: "user",
          content: `Parse this resume:\n\n${text.slice(0, 4000)}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("AI parsing error:", error);
    throw new Error("Failed to parse resume with AI");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = (user.subscriptionTier as "free" | "starter" | "pro") || "free";

    // 🔒 Only Starter + Pro can upload resumes
    if (tier === "free") {
      return NextResponse.json(
        { error: "UPGRADE_REQUIRED" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = file.type;
    const allowedTypes = ["application/pdf"];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are allowed" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text based on file type
    let parsed;

    if (fileType === "application/pdf") {
      parsed = await parseResumeFromPDFWithAI(buffer);
    } else {
      const text = await extractTextFromDOCX(buffer);
      parsed = await parseResumeWithAI(text);
    }


    // Store parsed data in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        image: JSON.stringify(parsed),
      },
    });


    return NextResponse.json({
      success: true,
      parsed,
    });
  } catch (error: any) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process resume" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = (user.subscriptionTier as "free" | "starter" | "pro") || "free";

    if (tier === "free") {
      return NextResponse.json(
        { error: "UPGRADE_REQUIRED" },
        { status: 403 }
      );
    }

    if (!user.image) {
      return NextResponse.json({ resumeData: null });
    }

    return NextResponse.json({
      resumeData: JSON.parse(user.image),
    });

  } catch (error) {
    console.error("Get resume error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume data" },
      { status: 500 }
    );
  }
}