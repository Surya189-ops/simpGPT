// app/api/formulagpt/razorpay/verify/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Get Supabase user from auth token (for authentication check)
    const cookieStore = await cookies(); // FIX: await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate subscriptionEndDate (30 days from now)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

    // Update or create Prisma User (upsert handles both cases)
    await prisma.user.upsert({
      where: {
        email: user.email!,
      },
      update: {
        subscriptionStatus: "active",
        subscriptionEndDate: subscriptionEndDate,
      },
      create: {
        id: user.id,
        email: user.email!,
        source: "formulagpt",
        emailVerified: new Date(), // Google users are already verified
        subscriptionStatus: "active",
        subscriptionEndDate: subscriptionEndDate,
      },
    });

    console.log(`[verify] Premium activated for ${user.email} until ${subscriptionEndDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: "Payment verified and premium activated",
      subscriptionEndDate: subscriptionEndDate.toISOString(),
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}