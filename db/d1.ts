import { env } from "cloudflare:workers";

export function getD1(): D1Database {
  if (!env.DB) {
    throw new Error("D1 binding `DB` is unavailable.");
  }
  return env.DB;
}

export function jsonError(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

export function asString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}
