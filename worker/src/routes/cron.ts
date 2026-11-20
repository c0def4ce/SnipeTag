import { verifyCron } from "../lib/auth";
import { runCron } from "../lib/cron";
import { error, json } from "../lib/http";
import type { Env } from "../types";

export async function cronEndpoint(env: Env, request: Request): Promise<Response> {
  if (!(await verifyCron(request, env))) return error("Unauthorized", 401);
  try {
    return json(await runCron(env));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Cron failed", 500);
  }
}
