import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 🔍 Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // ⛔ OTP rate limit (1 per 60 seconds)
    const recentOtp = await prisma.emailOTP.findFirst({
      where: {
        email,
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000),
        },
      },
    });

    if (recentOtp) {
      return NextResponse.json(
        { error: "Please wait 1 minute before requesting another OTP" },
        { status: 429 }
      );
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 👤 Create user (email NOT verified yet)
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: null,
        subscriptionTier: "free",
        subscriptionStatus: "inactive",
        searchCount: 0,
      },
    });

    // 🔢 Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🧹 Remove old OTPs
    await prisma.emailOTP.deleteMany({
      where: { email },
    });

    // 💾 Save OTP (valid for 10 minutes)
    await prisma.emailOTP.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // 📧 Send OTP email
    await resend.emails.send({
      from: "SimpJobs <no-reply@simpgpt.in>",
      to: email,
      subject: "Your SimpJobs verification code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6">
          <h2>Verify your email</h2>
          <p>Use the OTP below to activate your SimpJobs account:</p>
          <div style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:16px 0">
            ${otp}
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="font-size:12px;color:#666">
            If you didn’t create this account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent to email. Please verify to continue.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
