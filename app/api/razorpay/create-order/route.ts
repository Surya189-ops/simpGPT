import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    // 🔐 Get logged-in user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { amount, planName } = await req.json();

    if (!amount || !planName) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // 🧠 Attach userId to Razorpay order
    const order = await razorpay.orders.create({
      amount, // in paise
      currency: "INR",
      receipt: `simpjobs_${planName}_${Date.now()}`,
      notes: {
        product: "simpjobs",   // 🔥 Identify product
        userId: session.user.id,
        planName,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
    });
  } catch (err) {
    console.error("Razorpay create order error:", err);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
