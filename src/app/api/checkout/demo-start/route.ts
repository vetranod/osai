import { evaluateDecision } from "@/decision-engine/engine";
import { verifyAuthProof } from "@/lib/auth-proof";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { parseCheckoutPayload } from "@/server/checkoutPayload";
import { createRolloutFromInputs } from "@/server/rolloutCreation";

export const runtime = "nodejs";

function isDemoCheckoutEnabled(): boolean {
  return process.env.OSAI_DEMO_CHECKOUT_ENABLED === "true";
}

function isDemoEmailAllowed(email: string): boolean {
  const raw = process.env.OSAI_DEMO_ALLOWED_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    return process.env.VERCEL_ENV !== "production";
  }

  return allowed.includes(email.trim().toLowerCase());
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

  type DemoUser = {
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
    has_demo_access: boolean;
  };

  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();
  let user: DemoUser | null = cookieUser
    ? {
        id: cookieUser.id,
        email: cookieUser.email ?? null,
        email_confirmed_at: cookieUser.email_confirmed_at ?? null,
        has_demo_access: cookieUser.app_metadata?.demo_access === true,
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
          has_demo_access: tokenUser.app_metadata?.demo_access === true,
        };
        authReason = "bearer_token";
      } else {
        authReason = "invalid_token";
      }
    }
  }

  if (!user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser(session.access_token);
      if (sessionUser) {
        user = {
          id: sessionUser.id,
          email: sessionUser.email ?? null,
          email_confirmed_at: sessionUser.email_confirmed_at ?? null,
          has_demo_access: sessionUser.app_metadata?.demo_access === true,
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
            has_demo_access: false,
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

  // Allow invited users (app_metadata.demo_access) or global demo when enabled.
  if (!user.has_demo_access && !isDemoCheckoutEnabled()) {
    return Response.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  // Invited users (has_demo_access) skip the email-confirmation gate —
  // the invite flow confirms ownership; requiring email_confirmed_at blocks
  // users who accepted via the implicit-flow token path.
  if (!user.has_demo_access && (!user.email || !user.email_confirmed_at)) {
    return Response.json(
      {
        ok: false,
        message: "Please verify your account email before demo checkout.",
      },
      { status: 403 }
    );
  }

  if (!user.has_demo_access && !isDemoEmailAllowed(user.email)) {
    return Response.json(
      {
        ok: false,
        message: "Demo checkout is restricted for this account.",
      },
      { status: 403 }
    );
  }

  const demoSessionId = `demo_${Date.now()}_${user.id.slice(0, 8)}`;

  try {
    const created = await createRolloutFromInputs({
      inputs: parsed.value.inputs,
      identityFields: parsed.value.identity,
      generateM1Artifacts: true,
      payment: {
        provider: "demo",
        checkout_session_id: demoSessionId,
        payment_status: "demo_completed",
        user_id: user.id,
      },
    });

    return Response.json({
      ok: true,
      rollout_id: created.rollout.id,
      dashboard_url: `/rollouts/${created.rollout.id}`,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to complete demo checkout.",
      },
      { status: 500 }
    );
  }
}
