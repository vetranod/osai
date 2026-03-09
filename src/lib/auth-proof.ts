import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthProof = {
  userId: string;
  email: string;
  exp: number;
  sig: string;
  demoAccess?: boolean;
};

function getAuthProofSecret(): string {
  const secret = process.env.OSAI_AUTH_PROOF_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing required environment variable: OSAI_AUTH_PROOF_SECRET or SUPABASE_SERVICE_ROLE_KEY");
  }
  return secret;
}

function signPayload(userId: string, email: string, exp: number, demoAccess: boolean): string {
  const payload = `${userId}|${email}|${exp}|${demoAccess ? "1" : "0"}`;
  return createHmac("sha256", getAuthProofSecret()).update(payload).digest("hex");
}

export function createAuthProof(
  userId: string,
  email: string,
  hasDemoAccess = false,
  ttlSeconds = 1800
): AuthProof {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return {
    userId,
    email,
    exp,
    sig: signPayload(userId, email, exp, hasDemoAccess),
    demoAccess: hasDemoAccess || undefined,
  };
}

export function verifyAuthProof(candidate: unknown): AuthProof | null {
  if (!candidate || typeof candidate !== "object") return null;
  const proof = candidate as Partial<AuthProof>;
  if (!proof.userId || !proof.email || !proof.exp || !proof.sig) return null;
  if (typeof proof.userId !== "string") return null;
  if (typeof proof.email !== "string") return null;
  if (typeof proof.exp !== "number") return null;
  if (typeof proof.sig !== "string") return null;
  if (proof.exp < Math.floor(Date.now() / 1000)) return null;

  const demoAccess = proof.demoAccess === true;
  const expected = signPayload(proof.userId, proof.email, proof.exp, demoAccess);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(proof.sig, "utf8");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  return {
    userId: proof.userId,
    email: proof.email,
    exp: proof.exp,
    sig: proof.sig,
    demoAccess: demoAccess || undefined,
  };
}
