import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

const planToPriceId: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  premium: process.env.STRIPE_PRICE_PREMIUM
};

export async function POST(request: Request) {
  if (!stripeSecret) {
    return NextResponse.json({ message: "STRIPE_SECRET_KEY não configurada." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  const body = (await request.json()) as { planId?: string };
  const planId = body.planId ?? "basic";

  const priceId = planToPriceId[planId];
  if (!priceId) {
    return NextResponse.json({ message: "Preço do plano não configurado no ambiente." }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?payment=success`,
    cancel_url: `${origin}/checkout?payment=cancelled`
  });

  return NextResponse.json({ url: session.url });
}
