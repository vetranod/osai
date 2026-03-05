export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({
    hasUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY || !!process.env.STRIPE_API_KEY,
    hasStripePriceId: !!process.env.STRIPE_PRICE_ID,
    hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
  });
}
