import { getStripeServerClient } from "@/lib/stripe-server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  let stripeInitOk = false;
  let stripeInitError: string | null = null;
  try {
    getStripeServerClient();
    stripeInitOk = true;
  } catch (error) {
    stripeInitError = error instanceof Error ? error.message : "unknown";
  }

  return Response.json({
    hasUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY || !!process.env.STRIPE_API_KEY,
    hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasStripeApiKey: !!process.env.STRIPE_API_KEY,
    hasStripePriceId: !!process.env.STRIPE_PRICE_ID,
    hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    stripeInitOk,
    stripeInitError,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}
