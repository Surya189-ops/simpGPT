import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// 🚧 Guard FIRST (no Stripe import yet)
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  // ✅ Import Stripe ONLY when key exists
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { planName } = await req.json();

    if (!planName) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const amount = planName === "pro" ? 1500 : 500; // cents

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: session.user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              recurring: { interval: "month" },
              product_data: {
                name: `SimpJobs ${planName.toUpperCase()}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
          userId: session.user.id,
          planName,
        },
      });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
