"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession } from "@/lib/auth/session";
import { database, type UserRole } from "@/lib/db";

export type LoginState = { error?: string };

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }

  const { email, password } = parsed.data;
  let user: { id: number; name: string; email: string; role: UserRole; approvalStatus: "pending" | "approved" | "rejected" } | null = null;

  try {
    const record = await database()("users")
      .select("id", "name", "email", "role", "approval_status", "password_hash")
      .where({ email: email.toLowerCase(), is_active: true })
      .first();
    if (record && (await bcrypt.compare(password, record.password_hash))) {
      user = { id: Number(record.id), name: record.name, email: record.email, role: record.role, approvalStatus: record.approval_status };
    }
  } catch {
    return { error: "The service is temporarily unavailable. Please try again shortly." };
  }

  if (!user) return { error: "Email or password is incorrect." };
  await createSession(user);
  if (user.approvalStatus !== "approved") redirect("/application-pending");
  redirect(user.role === "coach" ? "/coach" : "/client");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
