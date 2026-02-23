// app/api/formulagpt/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if FormulaGPT user exists
    const user = await prisma.user.findFirst({
      where: {
        email,
        source: "formulagpt",
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    // Rate limit: 1 request per minute
    const recent = await prisma.emailOTP.findFirst({
      where: {
        email,
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000),
        },
      },
    });

    if (recent) {
      return NextResponse.json(
        { error: "Please wait 1 minute before retrying" },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.emailOTP.deleteMany({ where: { email } });
    await prisma.emailOTP.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send email via Resend
    await resend.emails.send({
      from: "FormulaGPT <no-reply@simpgpt.in>",
      to: email,
      subject: "Reset your FormulaGPT password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px;">
            We received a request to reset your FormulaGPT password. Use the code below to proceed:
          </p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">
              ${otp}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 10 minutes.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[formulagpt-forgot-password] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}