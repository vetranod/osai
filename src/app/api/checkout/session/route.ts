import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { getStripeServerClient } from "@/lib/stripe-server";
import { findRolloutByCheckoutSessionId } from "@/server/rolloutCreation";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return Response.json({ ok: false, message: "Missing session_id." }, { status: 400 });
  }

  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  try {
    const stripe = getStripeServerClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id && session.client_reference_id !== user.id) {
      return Response.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    const rolloutId = await findRolloutByCheckoutSessionId(session.id);
    return Response.json({
      ok: true,
      session_id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      rollout_id: rolloutId,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to fetch checkout session.",
      },
      { status: 500 }
    );
  }
}

