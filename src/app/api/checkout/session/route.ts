import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { verifyAuthProof } from "@/lib/auth-proof";
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
  type CheckoutUser = {
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
  };
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();
  let user: CheckoutUser | null = cookieUser
    ? {
        id: cookieUser.id,
        email: cookieUser.email ?? null,
        email_confirmed_at: cookieUser.email_confirmed_at ?? null,
      }
    : null;

  if (!user) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (token) {
      const {
        data: { user: tokenUser },
      } = await supabase.auth.getUser(token);
      if (tokenUser) {
        user = {
          id: tokenUser.id,
          email: tokenUser.email ?? null,
          email_confirmed_at: tokenUser.email_confirmed_at ?? null,
        };
      }
    }
  }

  if (!user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const sessionToken = session?.access_token;
    if (sessionToken) {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser(sessionToken);
      if (sessionUser) {
        user = {
          id: sessionUser.id,
          email: sessionUser.email ?? null,
          email_confirmed_at: sessionUser.email_confirmed_at ?? null,
        };
      }
    }
  }

  if (!user) {
    const rawProof = request.headers.get("x-osai-auth-proof");
    if (rawProof) {
      try {
        const proof = verifyAuthProof(JSON.parse(rawProof));
        if (proof) {
          user = {
            id: proof.userId,
            email: proof.email,
            email_confirmed_at: new Date().toISOString(),
          };
        }
      } catch {
        // ignore malformed proof
      }
    }
  }

  if (!user) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  try {
    const stripe = getStripeServerClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id && session.client_reference_id !== user.id) {
      return Response.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    const rolloutId = await findRolloutByCheckoutSessionId(session.id, user.id);
    const paymentSettled = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    const rolloutStatus =
      rolloutId
        ? "ready"
        : paymentSettled
          ? "paid_processing"
          : "pending_payment";

    return Response.json({
      ok: true,
      session_id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      rollout_status: rolloutStatus,
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
