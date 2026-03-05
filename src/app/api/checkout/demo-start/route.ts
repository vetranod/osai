import { evaluateDecision } from "@/decision-engine/engine";
import { verifyAuthProof } from "@/lib/auth-proof";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { parseCheckoutPayload } from "@/server/checkoutPayload";
import { createRolloutFromInputs } from "@/server/rolloutCreation";

export const runtime = "nodejs";

function isDemoCheckoutEnabled(): boolean {
  return process.env.OSAI_DEMO_CHECKOUT_ENABLED === "true";
}

export async function POST(request: Request): Promise<Response> {
  if (!isDemoCheckoutEnabled()) {
    return Response.json({ ok: false, message: "Not found." }, { status: 404 });
  }

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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser(session.access_token);
      user = sessionUser ?? null;
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
          } as typeof cookieUser;
        }
      } catch {
        // ignore malformed proof
      }
    }
  }

  if (!user) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  if (!user.email || !user.email_confirmed_at) {
    return Response.json(
      {
        ok: false,
        message: "Please verify your account email before demo checkout.",
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
