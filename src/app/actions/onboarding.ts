"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, readSession, requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { getInviteByToken, hashInviteToken } from "@/lib/onboarding/invites";
import { intakeFields, intakeSections } from "@/lib/onboarding/intake-fields";

export type ActionState = {
  error?: string;
  success?: string;
  link?: string;
  missingField?: string;
  missingStep?: number;
};

export async function createInviteAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("coach");
  const parsed = z.string().email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid client email." };

  const email = parsed.data.toLowerCase();
  const existingUser = await database()("users").where({ email }).first();
  if (existingUser) return { error: "An account already exists for this email." };

  const existingInvite = await database()("invites")
    .where({ email })
    .whereIn("status", ["sent", "opened", "submitted"])
    .where("expires_at", ">", new Date())
    .first();
  if (existingInvite) return { error: "This email already has an active invitation." };

  const token = randomBytes(32).toString("hex");
  await database()("invites").insert({
    email,
    token_hash: hashInviteToken(token),
    status: "sent",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const origin = (await headers()).get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { success: "Invite created. Send this private link to the client.", link: `${origin}/join/${token}` };
}

export async function submitIntakeAction(token: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const invite = await getInviteByToken(token);
  if (!invite || !["sent", "opened"].includes(invite.status)) return { error: "This invitation is invalid or has already been used." };

  const answers: Record<string, string> = {};
  for (const field of intakeFields) {
    const value = String(formData.get(field.name) || "").trim();
    if (!value) {
      const missingStep = intakeSections.findIndex((section) => section.fields.some((item) => item.name === field.name));
      return {
        error: `Please complete this question: ${field.label}`,
        missingField: field.name,
        missingStep: Math.max(0, missingStep),
      };
    }
    answers[field.name] = value;
  }

  await database()("invites").where({ id: invite.id }).update({
    intake_answers: JSON.stringify(answers),
    status: "submitted",
    opened_at: invite.opened_at || new Date(),
    submitted_at: new Date(),
  });
  revalidatePath("/coach");
  revalidatePath("/coach/invites");
  redirect(`/join/${token}/account`);
}

const accountSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirm_password: z.string(),
}).refine((value) => value.password === value.confirm_password, {
  message: "Passwords do not match.",
  path: ["confirm_password"],
});

export async function createInvitedAccountAction(token: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const invite = await getInviteByToken(token);
  if (!invite || invite.status !== "submitted" || !invite.intake_answers || invite.user_id) {
    return { error: "Complete the invited intake form before creating an account." };
  }

  const parsed = accountSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check your account details." };

  const answers = typeof invite.intake_answers === "string" ? JSON.parse(invite.intake_answers) : invite.intake_answers;
  const name = String(answers.full_name || "").trim();
  if (!name) return { error: "Your intake form is missing a full name." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let userId = 0;
  try {
    await database().transaction(async (trx) => {
      const [id] = await trx("users").insert({
        name,
        email: invite.email,
        password_hash: passwordHash,
        role: "client",
        approval_status: "pending",
        is_active: true,
      });
      userId = Number(id);
      await trx("clients").insert({
        user_id: userId,
        status: "paused",
        pipeline_stage: "onboarding",
        goals: answers.goals,
      });
      await trx("invites").where({ id: invite.id }).update({ user_id: userId });
    });
  } catch {
    return { error: "We could not create this account. The email may already be registered." };
  }

  revalidatePath("/coach");
  revalidatePath("/coach/invites");
  await createSession({ id: userId, name, email: invite.email, role: "client", approvalStatus: "pending" });
  redirect("/application-pending");
}

export async function approveApplicationAction(formData: FormData) {
  const coach = await requireRole("coach");
  const inviteId = Number(formData.get("invite_id"));
  const serviceId = Number(formData.get("service_id"));
  if (!inviteId) return;

  await database().transaction(async (trx) => {
    const invite = await trx("invites").where({ id: inviteId, status: "submitted" }).first();
    if (!invite?.user_id) throw new Error("Application is not ready for approval.");
    await trx("users").where({ id: invite.user_id, role: "client" }).update({ approval_status: "approved" });
    await trx("clients").where({ user_id: invite.user_id }).update({
      service_id: serviceId || null,
      status: "active",
      pipeline_stage: "onboarding",
      joined_at: new Date(),
    });
    await trx("invites").where({ id: inviteId }).update({
      status: "approved",
      selected_service_id: serviceId || null,
      reviewed_by: coach.id,
      approved_at: new Date(),
    });
  });
  revalidatePath("/coach/invites");
  revalidatePath("/coach");
  revalidatePath(`/coach/invites/${inviteId}`);
}

export async function rejectApplicationAction(formData: FormData) {
  const coach = await requireRole("coach");
  const inviteId = Number(formData.get("invite_id"));
  const notes = String(formData.get("review_notes") || "").trim();
  const invite = await database()("invites").where({ id: inviteId, status: "submitted" }).first();
  if (!invite) return;
  await database().transaction(async (trx) => {
    if (invite.user_id) {
      await trx("users").where({ id: invite.user_id }).update({ approval_status: "rejected" });
    }
    await trx("invites").where({ id: inviteId }).update({ status: "expired", reviewed_by: coach.id, review_notes: notes });
  });
  revalidatePath("/coach/invites");
  revalidatePath("/coach");
  revalidatePath(`/coach/invites/${inviteId}`);
}

export async function refreshApprovalAction() {
  const session = await readSession();
  if (!session || session.role !== "client") redirect("/");

  const user = await database()("users")
    .select("approval_status")
    .where({ id: session.id, role: "client" })
    .first();
  if (!user) redirect("/");

  if (user.approval_status === "approved") {
    await createSession({ ...session, approvalStatus: "approved" });
    redirect("/client");
  }

  redirect("/application-pending");
}

