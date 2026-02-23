// app/api/formulagpt/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // ── 1. Check if FormulaGPT user already exists ───────────────────────────
    // CRITICAL: Only check users with source: "formulagpt"
    // This allows the same email to exist in both SimpJobs and FormulaGPT
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        source: "formulagpt",
      },
      select: { id: true, emailVerified: true },
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { error: "Account already exists. Please login." },
        { status: 400 }
      );
    }

    // ── 2. Check FormulaGPT Supabase project ─────────────────────────────────
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingSupabaseUser = listData?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingSupabaseUser?.email_confirmed_at && existingUser?.emailVerified) {
      return NextResponse.json(
        { error: "Account already exists. Please login." },
        { status: 400 }
      );
    }

    // ── 3. Clean up stale unverified FormulaGPT records ──────────────────────
    if (existingUser && !existingUser.emailVerified) {
      await prisma.emailOTP.deleteMany({ where: { email } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
    if (existingSupabaseUser && !existingSupabaseUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.deleteUser(existingSupabaseUser.id);
    }

    // ── 4. Create user in FormulaGPT Supabase ────────────────────────────────
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmed in Supabase, gated by Prisma emailVerified
    });

    if (createError || !data?.user) {
      console.error("[formulagpt-signup] Supabase createUser error:", createError);
      return NextResponse.json(
        { error: createError?.message || "Failed to create account." },
        { status: 400 }
      );
    }

    // ── 5. Create Prisma user with source: "formulagpt" ──────────────────────
    await prisma.user.create({
      data: {
        id: data.user.id,
        email,
        source: "formulagpt", // ← Tags this as a FormulaGPT user
        emailVerified: null,
      },
    });

    // ── 6. Generate OTP and send via Resend ──────────────────────────────────
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.emailOTP.deleteMany({ where: { email } });
    await prisma.emailOTP.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const { error: emailError } = await resend.emails.send({
      from: "FormulaGPT <no-reply@simpgpt.in>",
      to: email,
      subject: "Verify your FormulaGPT account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p style="color: #666; font-size: 16px;">
            Thank you for signing up! Use the code below to verify your account:
          </p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4F46E5;">
              ${otp}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't sign up for FormulaGPT, please ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("[formulagpt-signup] Resend error:", emailError);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[formulagpt-signup] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}