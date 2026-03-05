import { evaluateDecision } from "@/decision-engine/engine";
import { verifyAuthProof } from "@/lib/auth-proof";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { getAppBaseUrl, getStripePriceId, getStripeServerClient } from "@/lib/stripe-server";
import { parseCheckoutPayload, toCheckoutMetadata, type CheckoutPayload } from "@/server/checkoutPayload";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL("/generate", request.url);
  url.searchParams.set("checkout", "start_requires_post");
  return Response.redirect(url, 307);
}

function buildCancelUrl(baseUrl: string, payload: CheckoutPayload): string {
  const cancel = new URL("/generate", baseUrl);
  cancel.searchParams.set("payment", "cancelled");
  cancel.searchParams.set("primary_goal", payload.inputs.primary_goal);
  cancel.searchParams.set("adoption_state", payload.inputs.adoption_state);
  cancel.searchParams.set("sensitivity_anchor", payload.inputs.sensitivity_anchor);
  cancel.searchParams.set("leadership_posture", payload.inputs.leadership_posture);
  if (payload.identity.initiative_lead_name) cancel.searchParams.set("initiative_lead_name", payload.identity.initiative_lead_name);
  if (payload.identity.initiative_lead_title) cancel.searchParams.set("initiative_lead_title", payload.identity.initiative_lead_title);
  if (payload.identity.approving_authority_name) cancel.searchParams.set("approving_authority_name", payload.identity.approving_authority_name);
  if (payload.identity.approving_authority_title) cancel.searchParams.set("approving_authority_title", payload.identity.approving_authority_title);
  return cancel.toString();
}

function resolveBaseUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return getAppBaseUrl();
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseCheckoutPayload(body);
  if (!parsed.ok) {
    return Response.json({ ok: false, message: parsed.message }, { status: 400 });
  }

  const decision = evaluateDecision(parsed.value.inputs);
  if (decision.output.sensitivity_tier === "REGULATED") {
    const id = parsed.value.identity;
    if (!id.initiative_lead_name || !id.initiative_lead_title || !id.approving_authority_name || !id.approving_authority_title) {
      return Response.json(
        {
          ok: false,
          message: "Regulated-tier rollouts require all ownership identity fields before checkout.",
        },
        { status: 400 }
      );
    }
  }

  type CheckoutUser = {
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
  };

  const supabase = await getSupabaseServerAuthClient();
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
  let authReason:
    | "cookie_user"
    | "bearer_token"
    | "cookie_session_token"
    | "signed_auth_proof"
    | "missing_auth"
    | "invalid_token" = user ? "cookie_user" : "missing_auth";
  let hadAuthHeader = false;

  if (!user) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    hadAuthHeader = Boolean(token);
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
        authReason = "bearer_token";
      } else {
        authReason = "invalid_token";
      }
    }
  }

  // Fallback: attempt to resolve from session cookie token directly.
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
        authReason = "cookie_session_token";
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
          authReason = "signed_auth_proof";
        }
      } catch {
        // ignore malformed proof
      }
    }
  }

  if (!user) {
    const requestHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      new URL(request.url).host;
    return Response.json(
      {
        ok: false,
        message: "Authentication required.",
        reason: authReason,
        has_auth_header: hadAuthHeader,
        request_host: requestHost,
        app_host: (() => {
          try {
            const app = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL;
            return app ? new URL(app).host : null;
          } catch {
            return null;
          }
        })(),
      },
      { status: 401 }
    );
  }
  if (!user.email || !user.email_confirmed_at) {
    return Response.json(
      {
        ok: false,
        message: "Please verify your account email before checkout.",
      },
      { status: 403 }
    );
  }

  try {
    const stripe = getStripeServerClient();
    const baseUrl = resolveBaseUrl(request);
    const successUrl = new URL("/generate/success", baseUrl);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: successUrl.toString(),
      cancel_url: buildCancelUrl(baseUrl, parsed.value),
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      metadata: toCheckoutMetadata(parsed.value, user.id),
    });

    return Response.json({
      ok: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to start checkout.",
      },
      { status: 500 }
    );
  }
}
