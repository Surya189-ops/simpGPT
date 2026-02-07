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

    // Check user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Get latest OTP
    const lastOtp = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    // ⏱ Cooldown: 60 seconds
    if (
      lastOtp &&
      Date.now() - new Date(lastOtp.createdAt).getTime() < 60 * 1000
    ) {
      return NextResponse.json(
        { error: "Please wait before requesting another OTP" },
        { status: 429 }
      );
    }

    // 🚫 Max 5 attempts
    if (lastOtp && lastOtp.attempts >= 5) {
      return NextResponse.json(
        { error: "Maximum OTP attempts reached" },
        { status: 429 }
      );
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete old OTPs
    await prisma.emailOTP.deleteMany({
      where: { email },
    });

    // Save new OTP
    await prisma.emailOTP.create({
      data: {
        email,
        code: otp,
        attempts: (lastOtp?.attempts || 0) + 1,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send email
    await resend.emails.send({
      from: "SimpJobs <no-reply@simpgpt.in>",
      to: email,
      subject: "Your new SimpJobs OTP",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>New OTP</h2>
          <p>Your new verification code:</p>
          <div style="font-size:28px;font-weight:bold;letter-spacing:4px">
            ${otp}
          </div>
          <p>Valid for 10 minutes.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
