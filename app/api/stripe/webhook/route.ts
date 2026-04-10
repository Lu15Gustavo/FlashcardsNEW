import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!stripeSecret || !stripeWebhookSecret) {
    return NextResponse.json({ message: "Chaves Stripe ausentes." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ message: "Assinatura do webhook ausente." }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);

    if (event.type === "checkout.session.completed") {
      // Ponto para atualizar plano do usuário no banco (ex: Supabase profile/subscriptions).
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ message: "Webhook inválido." }, { status: 400 });
  }
}
