import Stripe from "stripe";
import { getStripeServerClient, getStripeWebhookSecret } from "@/lib/stripe-server";
import { fromCheckoutMetadata } from "@/server/checkoutPayload";
import { createRolloutFromInputs, findRolloutByCheckoutSessionId } from "@/server/rolloutCreation";

export const runtime = "nodejs";

async function handleCompletedSession(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.id) return;
  const existing = await findRolloutByCheckoutSessionId(session.id);
  if (existing) return;

  const payload = fromCheckoutMetadata(session.metadata ?? null);
  if (!payload) {
    throw new Error("Checkout metadata was missing or invalid.");
  }

  await createRolloutFromInputs({
    inputs: payload.inputs,
    identityFields: payload.identity,
    generateM1Artifacts: true,
    payment: {
      provider: "stripe",
      checkout_session_id: session.id,
      payment_status: session.payment_status ?? "unknown",
      user_id: session.client_reference_id ?? null,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ ok: false, message: "Missing stripe-signature header." }, { status: 400 });
  }

  try {
    const stripe = getStripeServerClient();
    const event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());

    if (event.type === "checkout.session.completed") {
      await handleCompletedSession(event.data.object as Stripe.Checkout.Session);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}

