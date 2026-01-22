// app/api/medbillgpt/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const billText = formData.get("billText") as string;
    const file = formData.get("file") as File | null;

    let billContent = billText || "";

    // If image is uploaded, extract text using GPT-4 Vision
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = buffer.toString('base64');
      
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text from this medical bill image. List every charge, amount, date, and detail you can see. Format it clearly."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      });

      const extractedText = visionResponse.choices[0]?.message?.content || "";
      billContent = extractedText + "\n\n" + billText;
    }

    if (!billContent.trim()) {
      return NextResponse.json({ 
        explanation: "Please provide bill details either by uploading an image or entering text." 
      });
    }

    const prompt = `
You are MedBillGPT, an AI assistant that explains United States medical bills in simple, clear language for patients.

Your job:
Help users understand their medical bill so they feel confident discussing it with hospitals or insurance providers.

Rules:
1. Carefully read the provided medical bill text.
2. List each charge and explain what it likely means in simple words.
3. If medical or procedure terms are complex, explain them briefly.
4. If insurance payments, adjustments, or patient responsibility amounts are visible, explain them clearly.
5. Highlight charges that seem unusually high, unclear, or worth questioning.
6. Provide 3 to 6 practical questions the user can ask the hospital or insurance company.
7. Keep language simple, friendly, and non-technical.
8. Do NOT provide medical diagnosis.
9. Do NOT provide legal advice.
10. If important bill details are missing or unclear, mention what is missing.
11. Keep the response structured using numbered sections.
12. Be calm, supportive, and professional in tone.
13. End every response with this disclaimer EXACTLY:
"This explanation is for general understanding only and is not medical or legal advice."

Response style example:
1. Emergency Room Facility Fee – This is the base charge for using the emergency department.
2. Blood Test Panel – Cost for laboratory testing of blood samples.
3. CT Scan – Imaging procedure used to check internal organs.

Possible concerns:
The CT scan charge appears higher than typical average pricing.

Questions you can ask:
- Can I request a fully itemized bill?
- Was this CT scan medically necessary?
- Is there a self-pay or prompt-pay discount available?

Always follow this style.

Here is the medical bill to analyze:

${billContent}

Provide your explanation now:
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.5,
    });

    const explanation = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ explanation });

  } catch (error) {
    console.error("MedBillGPT API Error:", error);
    return NextResponse.json({ 
      explanation: "Sorry, there was an error analyzing your bill. Please try again." 
    }, { status: 500 });
  }
}
