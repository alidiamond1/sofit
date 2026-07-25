"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type NotificationActionState = { error?: string; success?: string };

const notificationSchema = z.object({
  recipient_id: z.coerce.number().int().positive(),
  title: z.string().trim().min(3, "Add a clear notification title.").max(120),
  message: z.string().trim().min(3, "Add a message for the client.").max(1000),
});

export async function sendNotificationAction(
  _previous: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const coach = await requireRole("coach");
  const parsed = notificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the notification details." };

  const recipient = await database()("users")
    .select("users.id", "users.name")
    .innerJoin("clients", "clients.user_id", "users.id")
    .where({ "users.id": parsed.data.recipient_id, "users.role": "client", "users.is_active": true, "users.approval_status": "approved" })
    .first();
  if (!recipient) return { error: "Choose an active approved client." };

  await database()("notifications").insert({
    user_id: recipient.id,
    sender_id: coach.id,
    title: parsed.data.title,
    message: parsed.data.message,
    type: "coach_message",
    created_at: new Date(),
    updated_at: new Date(),
  });

  revalidatePath("/coach/settings");
  revalidatePath("/client", "layout");
  return { success: `Notification sent to ${recipient.name}.` };
}

export async function markNotificationReadAction(
  role: "coach" | "client",
  notificationId: number,
) {
  const session = await requireRole(role);
  await database()("notifications")
    .where({ id: notificationId, user_id: session.id })
    .whereNull("read_at")
    .update({ read_at: new Date(), updated_at: new Date() });
  revalidatePath(`/${role}`, "layout");
  revalidatePath(`/${role}/settings`);
}
