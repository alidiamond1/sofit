"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { requirePaidClient } from "@/lib/payments/billing";
import { todayISO } from "@/lib/schedule";
import { shiftWalkingDate, walkingLogTotal, walkingLogSchema, walkingTargetSchema, walkingTargetForDay, walkingTargetFromRow } from "@/lib/walking";

export type WalkingState = { error?: string; success?: boolean; total?: number; target?: number };

function refreshWalking() {
  revalidatePath("/coach/workout-plans");
  revalidatePath("/client/walking");
  revalidatePath("/client/health");
  revalidatePath("/client/progress");
  revalidatePath("/client");
}

export async function saveWalkingTargetAction(_previous: WalkingState, form: FormData): Promise<WalkingState> {
  await requireRole("coach");
  let dailyTargets: unknown;
  try { dailyTargets = JSON.parse(String(form.get("daily_targets"))); } catch { return { error: "invalidTarget" }; }
  const parsed = walkingTargetSchema.safeParse({
    clientId: form.get("client_id"), unit: form.get("unit"), amount: form.get("amount"),
    startsOn: form.get("starts_on"), active: form.get("active") === "true", notes: form.get("notes") || "",
    dailyTargets,
  });
  if (!parsed.success) return { error: "invalidTarget" };
  const value = parsed.data;
  try {
    const result = await database().transaction(async (trx) => {
      const client = await trx("clients").where({ id: value.clientId }).forUpdate().first();
      if (!client || client.status === "churned") return { error: "missingClient" };
      const settings = await trx("user_settings").select("timezone").where({ user_id: client.user_id }).first();
      const today = todayISO(String(settings?.timezone || "Africa/Nairobi"));
      const current = await trx("walking_targets").where({ client_id: client.id }).where("starts_on", "<=", today).first();
      // Once a day starts, its prescription is immutable, even if no log exists yet.
      const earliest = current ? shiftWalkingDate(today, 1) : today;
      if (value.startsOn < earliest) return { error: "pastTarget" };
      const target = { unit: value.unit, amount: value.amount, starts_on: value.startsOn, active: value.active, notes: value.notes, daily_targets: JSON.stringify(value.dailyTargets) };
      await trx("walking_targets").insert({ client_id: client.id, ...target })
        .onConflict(["client_id", "starts_on"]).merge({ ...target, updated_at: trx.fn.now() });
      return { success: true };
    });
    if (result.success) refreshWalking();
    return result;
  } catch {
    return { error: "saveFailed" };
  }
}

export async function saveWalkingLogAction(_previous: WalkingState, form: FormData): Promise<WalkingState> {
  const session = await requireRole("client");
  await requirePaidClient(session.id);
  const parsed = walkingLogSchema.safeParse({ date: form.get("date"), amount: form.get("amount"), targetId: form.get("target_id"), notes: form.get("notes") || "", mode: form.get("mode"), expectedAmount: form.get("expected_amount") });
  if (!parsed.success) return { error: "invalidLog" };
  const value = parsed.data;
  try {
    const result = await database().transaction(async (trx) => {
      const client = await trx("clients").where({ user_id: session.id }).forUpdate().first();
      if (!client) return { error: "missingClient" };
      const settings = await trx("user_settings").select("timezone").where({ user_id: session.id }).first();
      const today = todayISO(String(settings?.timezone || "Africa/Nairobi"));
      if (value.date > today || value.date < shiftWalkingDate(today, -29)) return { error: "invalidDate" };
      const row = await trx("walking_targets").where({ client_id: client.id }).where("starts_on", "<=", value.date).orderBy("starts_on", "desc").first();
      const target = row && walkingTargetForDay([walkingTargetFromRow(row)], value.date);
      if (!target?.active || Number(target.id) !== value.targetId) return { error: "targetChanged" };
      const previous = await trx("walking_logs").where({ client_id: client.id, logged_on: value.date }).first();
      const current = Number(previous?.amount || 0);
      // Reject forms based on a total that has changed, including duplicate pending submissions.
      if (current !== value.expectedAmount) return { error: "logChanged" };
      const total = walkingLogTotal(current, value.amount, value.mode, target.unit);
      if (total === null) return { error: "invalidLog" };
      const notes = value.mode === "add" ? [previous?.notes, value.notes].filter(Boolean).join("\n") : value.notes;
      if (notes.length > 500) return { error: "notesFull" };
      await trx("walking_logs").insert({ client_id: client.id, target_id: target.id, logged_on: value.date, amount: total, notes })
        .onConflict(["client_id", "logged_on"]).merge({ amount: total, notes, updated_at: trx.fn.now() });
      return { success: true, total, target: target.amount };
    });
    if (result.success) refreshWalking();
    return result;
  } catch {
    return { error: "saveFailed" };
  }
}
