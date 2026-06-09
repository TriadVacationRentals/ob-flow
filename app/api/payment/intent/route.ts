import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try { body = await req.json(); }
  catch { body = {}; }

  const intent = await stripe.paymentIntents.create({
    amount: 60000,
    currency: "usd",
    receipt_email: body.email ?? undefined,
    payment_method_types: ["card"],
    metadata: { type: "onboarding_fee" },
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
