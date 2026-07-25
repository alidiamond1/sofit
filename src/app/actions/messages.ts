"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database, type UserRole } from "@/lib/db";

export type MessageActionState = {
  error?: string;
  success?: string;
  sentAt?: number;
};

const sendSchema = z.object({
  recipient_id: z.coerce.number().int().positive(),
  body: z.string().trim().min(1, "Write a message before sending.").max(5000, "Keep messages under 5,000 characters."),
});

async function canMessage(role: UserRole, senderId: number, recipientId: number) {
  if (senderId === recipientId) return false;
  if (role === "client") {
    const coach = await database()("users")
      .select("id")
      .where({ id: recipientId, role: "coach", is_active: true })
      .first();
    return Boolean(coach);
  }

  const client = await database()("users")
    .select("users.id")
    .innerJoin("clients", "clients.user_id", "users.id")
    .where({
      "users.id": recipientId,
      "users.role": "client",
      "users.is_active": true,
      "users.approval_status": "approved",
    })
    .whereNot("clients.status", "churned")
    .first();
  return Boolean(client);
}

function refreshMessageViews(role: UserRole) {
  const otherRole = role === "coach" ? "client" : "coach";
  revalidatePath(`/${role}/messages`);
  revalidatePath(`/${otherRole}/messages`);
  revalidatePath(`/${role}`, "layout");
  revalidatePath(`/${otherRole}`, "layout");
}

export async function sendMessageAction(
  role: UserRole,
  _previous: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const session = await requireRole(role);
  const parsed = sendSchema.safeParse({
    recipient_id: formData.get("recipient_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Check your message and try again." };
  }

  if (!(await canMessage(role, session.id, parsed.data.recipient_id))) {
    return { error: "This conversation is not available." };
  }

  await database()("messages").insert({
    sender_id: session.id,
    recipient_id: parsed.data.recipient_id,
    body: parsed.data.body,
    created_at: new Date(),
    updated_at: new Date(),
  });

  refreshMessageViews(role);
  return { success: "Message sent.", sentAt: Date.now() };
}

export async function markConversationReadAction(role: UserRole, counterpartId: number) {
  const session = await requireRole(role);
  if (!(await canMessage(role, session.id, counterpartId))) return;

  await database()("messages")
    .where({ sender_id: counterpartId, recipient_id: session.id })
    .whereNull("read_at")
    .update({ read_at: new Date(), updated_at: new Date() });

  revalidatePath(`/${role}/messages`);
  revalidatePath(`/${role}`, "layout");
}

export async function markMessageReadAction(role: UserRole, messageId: number) {
  const session = await requireRole(role);
  await database()("messages")
    .where({ id: messageId, recipient_id: session.id })
    .whereNull("read_at")
    .update({ read_at: new Date(), updated_at: new Date() });
  revalidatePath(`/${role}/messages`);
  revalidatePath(`/${role}`, "layout");
}
