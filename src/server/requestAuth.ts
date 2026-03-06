import { verifyAuthProof } from "@/lib/auth-proof";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { userCanAccessRollout } from "@/server/rolloutAccess";

export type RequestUser = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  auth_source: "cookie_user" | "bearer_token" | "cookie_session_token" | "signed_auth_proof";
};

export async function resolveRequestUser(request: Request): Promise<RequestUser | null> {
  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();

  if (cookieUser) {
    return {
      id: cookieUser.id,
      email: cookieUser.email ?? null,
      email_confirmed_at: cookieUser.email_confirmed_at ?? null,
      auth_source: "cookie_user",
    };
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    const {
      data: { user: tokenUser },
    } = await supabase.auth.getUser(bearerToken);

    if (tokenUser) {
      return {
        id: tokenUser.id,
        email: tokenUser.email ?? null,
        email_confirmed_at: tokenUser.email_confirmed_at ?? null,
        auth_source: "bearer_token",
      };
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser(session.access_token);

    if (sessionUser) {
      return {
        id: sessionUser.id,
        email: sessionUser.email ?? null,
        email_confirmed_at: sessionUser.email_confirmed_at ?? null,
        auth_source: "cookie_session_token",
      };
    }
  }

  const rawProof = request.headers.get("x-osai-auth-proof");
  if (rawProof) {
    try {
      const proof = verifyAuthProof(JSON.parse(rawProof));
      if (proof) {
        return {
          id: proof.userId,
          email: proof.email,
          email_confirmed_at: new Date().toISOString(),
          auth_source: "signed_auth_proof",
        };
      }
    } catch {
      // Ignore malformed proofs and continue as unauthenticated.
    }
  }

  return null;
}

export async function requireRequestUser(
  request: Request
): Promise<{ ok: true; user: RequestUser } | { ok: false; response: Response }> {
  const user = await resolveRequestUser(request);
  if (!user) {
    return {
      ok: false,
      response: Response.json({ ok: false, message: "Authentication required." }, { status: 401 }),
    };
  }

  return { ok: true, user };
}

export async function requireRolloutAccess(
  request: Request,
  rolloutId: string
): Promise<{ ok: true; user: RequestUser } | { ok: false; response: Response }> {
  const auth = await requireRequestUser(request);
  if (!auth.ok) return auth;

  const allowed = await userCanAccessRollout(rolloutId, auth.user.id);
  if (!allowed) {
    return {
      ok: false,
      response: Response.json({ ok: false, message: "Rollout not found." }, { status: 404 }),
    };
  }

  return auth;
}
