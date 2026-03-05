import { evaluateDecision } from "@/decision-engine/engine";
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

  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();
  let user = cookieUser;

  if (!user) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (token) {
      const {
        data: { user: tokenUser },
      } = await supabase.auth.getUser(token);
      user = tokenUser ?? null;
    }
  }

  if (!user) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
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
