import { getAccessToken } from "./supabase";

export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  upgrade: boolean;
  constructor(message: string, status: number, upgrade = false) {
    super(message);
    this.status = status;
    this.upgrade = upgrade;
  }
}

/** Call the Cloudflare Worker API. Returns typed JSON or throws ApiError. */
export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: API_BASE ? "omit" : "same-origin",
    });
  } catch {
    throw new ApiError("Cannot reach the SnipeTag API. Check VITE_API_URL.", 0);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("json")
    ? await response.json().catch(() => ({}))
    : {};
  if (!response.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? `Request failed (${response.status})`,
      response.status,
      Boolean((data as { upgrade?: boolean }).upgrade),
    );
  }
  if (!contentType.includes("json")) {
    throw new ApiError("SnipeTag API did not return JSON. Check VITE_API_URL.", response.status);
  }
  return data as T;
}

export function configured(): boolean {
  return Boolean(API_BASE) || typeof window !== "undefined" && window.location.hostname !== "localhost";
}
