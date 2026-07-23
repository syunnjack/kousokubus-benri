import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "./chatgpt-auth";

export function isNoluAdmin(user: ChatGPTUser) {
  const configured = (env as unknown as { NOLU_ADMIN_EMAILS?: string }).NOLU_ADMIN_EMAILS || "";
  const emails = configured.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return emails.includes(user.email.toLowerCase());
}
