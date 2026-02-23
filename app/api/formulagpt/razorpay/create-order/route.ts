// app/api/formulagpt/razorpay/create-order/route.ts

import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    // Get Supabase user from auth token
    const cookieStore = await cookies();
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

    // Production amount: ₹49 = 4900 paise
    const amount = 4900;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `formulagpt_pro_${Date.now()}`,
      notes: {
        product: "formulagpt",
        userId: user.id,
        userEmail: user.email || "",
        planName: "FormulaGPT Pro",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error("Razorpay create order error:", err);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}