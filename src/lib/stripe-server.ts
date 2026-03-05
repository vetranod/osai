import Stripe from "stripe";

let cached: Stripe | null = null;

function requireAnyEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function requireEnv(name: string): string {
  return requireAnyEnv([name]);
}

export function getStripeServerClient(): Stripe {
  if (cached) return cached;
  const secretKey = requireAnyEnv(["STRIPE_SECRET_KEY", "STRIPE_API_KEY"]);
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
