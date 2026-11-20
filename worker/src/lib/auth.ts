import type { Env } from "../types";

export interface AuthUser {
  id: string;
  email?: string;
  token: string;
}

/** Verify a Supabase access token by asking Supabase Auth itself. */
export async function getUser(request: Request, env: Env): Promise<AuthUser | null> {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string; email?: string };
  if (!user.id) return null;
  return { id: user.id, email: user.email, token };
}

export async function verifyCron(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get("Authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const provided = bearer || request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret") || "";
  return Boolean(env.CRON_SECRET) && provided === env.CRON_SECRET;
}
