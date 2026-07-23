import "server-only";

import { createHash } from "node:crypto";
import { database } from "@/lib/db";

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getInviteByToken(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;

  const invite = await database()("invites")
    .select("invites.*", "users.name as user_name", "users.approval_status")
    .leftJoin("users", "users.id", "invites.user_id")
    .where("invites.token_hash", hashInviteToken(token))
    .first();

  if (!invite || new Date(invite.expires_at).getTime() < Date.now()) return null;
  return invite;
}

