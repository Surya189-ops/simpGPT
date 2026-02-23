import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST() {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: 9900, // ₹99 (amount is in paise)
      currency: "INR",
      receipt: `formulagpt_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to create order" },
      { status: 500 }
    );
  }
}
