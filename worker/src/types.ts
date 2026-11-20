import type { Fetcher, KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CRON_SECRET: string;

  ALLOWED_ORIGIN?: string;
  /** Public site origin (GitHub Pages or Worker custom domain) used for redirects and alerts. */
  SITE_URL?: string;
  /** Worker origin, kept as a fallback for redirects. */
  APP_URL?: string;
  RESEND_API_KEY?: string;
  ALERTS_FROM_EMAIL?: string;

  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_YEARLY: string;

  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;

  PUSH_KV: KVNamespace;
  ASSETS?: Fetcher;
}
