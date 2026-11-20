import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Env } from "../types";

const noPersistence = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** User-scoped client: forwards the JWT so Postgres RLS still applies. */
export function userDb(env: Env, token: string): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...noPersistence,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Service-role client for catalog writes, cron and Stripe webhooks. */
export function adminDb(env: Env): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, noPersistence);
}
