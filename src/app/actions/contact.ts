"use server";

import { z } from "zod";
import { database } from "@/lib/db";

export type ContactActionState = { error?: string; success?: string };

const contactSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name.").max(80),
  last_name: z.string().trim().min(1, "Enter your last name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10, "Add a few words about what you need.").max(2000),
});

export async function submitContactAction(_previous: ContactActionState, formData: FormData): Promise<ContactActionState> {
  const parsed = contactSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the form and try again." };

  const name = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();

  try {
    await database()("contact_messages").insert({
      name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });

    const coach = await database()("users").select("id").where({ role: "coach", is_active: true }).first();
    if (coach) {
      await database()("notifications").insert({
        user_id: coach.id,
        sender_id: null,
        title: `New contact message from ${name}`,
        message: parsed.data.message.slice(0, 500),
        type: "contact",
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  } catch {
    return { error: "The service is temporarily unavailable. Please try again shortly." };
  }

  return { success: "Message sent — the coach will get back to you directly." };
}
