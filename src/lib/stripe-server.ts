import Stripe from "stripe";

let cached: Stripe | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getStripeServerClient(): Stripe {
  if (cached) return cached;
  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  cached = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });
  return cached;
}

export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceId(): string {
  return requireEnv("STRIPE_PRICE_ID");
}

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
