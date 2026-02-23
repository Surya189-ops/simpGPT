// app/api/formulagpt/resend-otp/route.ts
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

    // Only check FormulaGPT users
    const user = await prisma.user.findFirst({
      where: {
        email,
        source: "formulagpt",
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found. Please sign up first." },
        { status: 404 }
      );
    }

    // Cooldown: 60 seconds
    const lastOtp = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (
      lastOtp &&
      Date.now() - new Date(lastOtp.createdAt).getTime() < 60 * 1000
    ) {
      return NextResponse.json(
        { error: "Please wait before requesting another OTP" },
        { status: 429 }
      );
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.emailOTP.deleteMany({ where: { email } });
    await prisma.emailOTP.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send via Resend
    await resend.emails.send({
      from: "FormulaGPT <no-reply@simpgpt.in>",
      to: email,
      subject: "Verify your FormulaGPT account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your New Verification Code</h2>
          <p style="color: #666; font-size: 16px;">Use this code to verify your FormulaGPT account:</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4F46E5;">
              ${otp}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[formulagpt-resend-otp] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}