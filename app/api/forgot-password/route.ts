import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
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

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    // ⛔ Rate limit (1 per minute)
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.emailOTP.deleteMany({ where: { email } });

    await prisma.emailOTP.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await resend.emails.send({
      from: "SimpJobs <no-reply@simpgpt.in>",
      to: email,
      subject: "Reset your SimpJobs password",
      html: `
        <h2>Password Reset</h2>
        <p>Your OTP:</p>
        <div style="font-size:28px;font-weight:bold">${otp}</div>
        <p>Expires in 10 minutes</p>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
