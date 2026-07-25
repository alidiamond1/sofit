"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSession, requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type ProfileActionState = { error?: string; success?: string };

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);

const baseProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: optionalText(40),
  date_of_birth: z.string().trim().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date.").transform((value) => value || null),
  location: optionalText(160),
  bio: optionalText(1200),
});

const clientProfileSchema = baseProfileSchema.extend({
  goals: optionalText(5000),
  medical_notes: optionalText(5000),
});

function refreshAccountPages(role: "coach" | "client") {
  revalidatePath(`/${role}`, "layout");
  revalidatePath(`/${role}/profile`);
  revalidatePath(`/${role}/settings`);
}

export async function updateProfileAction(
  role: "coach" | "client",
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireRole(role);
  const payload = Object.fromEntries(formData);
  const parsed = role === "client" ? clientProfileSchema.safeParse(payload) : baseProfileSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check your profile details." };

  const { name, phone, date_of_birth, location, bio } = parsed.data;
  await database().transaction(async (trx) => {
    await trx("users").where({ id: session.id, role }).update({ name, phone, date_of_birth, location, bio, updated_at: new Date() });
    if (role === "client") {
      const clientData = parsed.data as z.infer<typeof clientProfileSchema>;
      await trx("clients").where({ user_id: session.id }).update({
        phone,
        date_of_birth,
        goals: clientData.goals,
        medical_notes: clientData.medical_notes,
        updated_at: new Date(),
      });
    }
  });

  await createSession({ ...session, name });
  refreshAccountPages(role);
  return { success: "Profile updated successfully." };
}

const avatarTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function validImageSignature(bytes: Uint8Array, mime: keyof typeof avatarTypes) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function uploadAvatarAction(
  role: "coach" | "client",
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireRole(role);
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a profile photo first." };
  if (!(file.type in avatarTypes)) return { error: "Use a JPG, PNG, or WebP image." };
  if (file.size > 2 * 1024 * 1024) return { error: "Profile photo must be smaller than 2 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type as keyof typeof avatarTypes;
  if (!validImageSignature(bytes, mime)) return { error: "This file is not a valid image." };

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `profile-${session.id}-${Date.now()}.${avatarTypes[mime]}`;
  await writeFile(path.join(uploadDirectory, filename), bytes);
  const avatarPath = `/uploads/profiles/${filename}`;
  await database()("users").where({ id: session.id, role }).update({ avatar_path: avatarPath, updated_at: new Date() });

  refreshAccountPages(role);
  return { success: "Profile photo updated." };
}

const settingsSchema = z.object({
  timezone: z.enum(["Africa/Nairobi", "UTC", "Europe/London", "America/New_York"]),
  language: z.enum(["en", "so"]),
  theme: z.enum(["light", "dark", "system"]),
});

export async function updatePreferencesAction(
  role: "coach" | "client",
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireRole(role);
  const parsed = settingsSchema.safeParse({ timezone: formData.get("timezone"), language: formData.get("language"), theme: formData.get("theme") });
  if (!parsed.success) return { error: "Choose valid account preferences." };

  const values = {
    ...parsed.data,
    updated_at: new Date(),
  };
  await database()("user_settings").insert({ user_id: session.id, ...values }).onConflict("user_id").merge(values);
  refreshAccountPages(role);
  return { success: "Preferences saved." };
}

export async function updateThemeAction(
  role: "coach" | "client",
  theme: "light" | "dark",
): Promise<ProfileActionState> {
  const session = await requireRole(role);
  const parsed = z.enum(["light", "dark"]).safeParse(theme);
  if (!parsed.success) return { error: "Choose a valid theme." };

  const values = { theme: parsed.data, updated_at: new Date() };
  await database()("user_settings").insert({ user_id: session.id, ...values }).onConflict("user_id").merge(values);
  revalidatePath(`/${role}`, "layout");
  revalidatePath(`/${role}/settings`);
  return { success: "Theme updated." };
}

export async function updateNotificationsAction(
  role: "coach" | "client",
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireRole(role);
  const values = {
    email_notifications: formData.has("email_notifications"),
    in_app_notifications: formData.has("in_app_notifications"),
    weekly_summary: formData.has("weekly_summary"),
    session_reminders: formData.has("session_reminders"),
    updated_at: new Date(),
  };
  await database()("user_settings").insert({ user_id: session.id, ...values }).onConflict("user_id").merge(values);
  refreshAccountPages(role);
  return { success: "Notification choices saved." };
}

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "New password must be at least 8 characters."),
  confirm_password: z.string(),
}).refine((value) => value.new_password === value.confirm_password, { message: "New passwords do not match.", path: ["confirm_password"] });

export async function changePasswordAction(
  role: "coach" | "client",
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireRole(role);
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check your password." };

  const user = await database()("users").select("password_hash").where({ id: session.id, role }).first();
  if (!user || !(await bcrypt.compare(parsed.data.current_password, user.password_hash))) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.new_password, 12);
  await database()("users").where({ id: session.id, role }).update({ password_hash: passwordHash, updated_at: new Date() });
  return { success: "Password changed successfully." };
}
