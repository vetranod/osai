import Stripe from "stripe";
import { getStripeServerClient, getStripeWebhookSecret } from "@/lib/stripe-server";
import { fromCheckoutMetadata } from "@/server/checkoutPayload";
import { createRolloutFromInputs, findRolloutByCheckoutSessionId } from "@/server/rolloutCreation";

export const runtime = "nodejs";
export const maxDuration = 60;

function isRolloutCreationReady(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

function resolveCheckoutUserId(session: Stripe.Checkout.Session): string | null {
  const clientReferenceId =
    typeof session.client_reference_id === "string" && session.client_reference_id
      ? session.client_reference_id
      : null;
  const metadataUserId =
    typeof session.metadata?.user_id === "string" && session.metadata.user_id
      ? session.metadata.user_id
      : null;

  return clientReferenceId || metadataUserId;
}

async function handleCompletedSession(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.id) return;
  if (!isRolloutCreationReady(session)) {
    console.warn("stripe webhook: checkout completed before payment settled", {
      sessionId: session.id,
      paymentStatus: session.payment_status ?? null,
      sessionStatus: session.status ?? null,
    });
    return;
  }

  const existing = await findRolloutByCheckoutSessionId(session.id);
  if (existing) return;

  const payload = fromCheckoutMetadata(session.metadata ?? null);
  if (!payload) {
    throw new Error("Checkout metadata was missing or invalid.");
  }

  const checkoutUserId = resolveCheckoutUserId(session);
  if (!checkoutUserId) {
    throw new Error("Checkout session was missing user linkage.");
  }

  await createRolloutFromInputs({
    inputs: payload.inputs,
    identityFields: payload.identity,
    generateM1Artifacts: true,
    payment: {
      provider: "stripe",
      checkout_session_id: session.id,
      payment_status: session.payment_status ?? "unknown",
      user_id: checkoutUserId,
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
    console.error("stripe webhook processing failed", error);
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}
