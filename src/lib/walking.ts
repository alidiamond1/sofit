import { z } from "zod";

export type WalkingTarget = { id: number; unit: "steps" | "km"; amount: number; startsOn: string; active: boolean; notes: string; dailyTargets?: Array<number | null> | null };
export type WalkingLog = { date: string; amount: number; notes: string };
export type WalkingDay = { date: string; target: WalkingTarget; log?: WalkingLog; percent: number; status: "met" | "below" | "missing" | "pending" };

export function validWalkingAmount(amount: number, unit: WalkingTarget["unit"]) {
  return Number.isFinite(amount) && amount >= 0 && (unit === "steps"
    ? Number.isInteger(amount) && amount <= 100000
    : amount <= 100 && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8);
}

export const walkingTargetSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  unit: z.enum(["steps", "km"]),
  amount: z.coerce.number().positive(),
  startsOn: z.iso.date(),
  active: z.boolean(),
  notes: z.string().trim().max(1000),
  dailyTargets: z.array(z.number().positive().nullable()).min(1).max(90),
}).refine((value) => validWalkingAmount(value.amount, value.unit)
  && value.dailyTargets.some((amount) => amount !== null)
  && value.dailyTargets.every((amount) => amount === null || validWalkingAmount(amount, value.unit)));

export const walkingLogSchema = z.object({
  date: z.iso.date(),
  // An empty input is not a recorded zero.
  amount: z.string().trim().min(1).transform(Number).pipe(z.number().nonnegative()),
  targetId: z.coerce.number().int().positive(),
  notes: z.string().trim().max(500),
  mode: z.enum(["add", "replace"]),
  expectedAmount: z.coerce.number().nonnegative(),
});

export function walkingLogTotal(current: number, amount: number, mode: "add" | "replace", unit: WalkingTarget["unit"]) {
  if (!validWalkingAmount(amount, unit)) return null;
  const total = mode === "add" ? Math.round((current + amount) * 100) / 100 : amount;
  return validWalkingAmount(total, unit) ? total : null;
}

export function shiftWalkingDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function walkingTargetOn(targets: WalkingTarget[], date: string) {
  return targets.filter((target) => target.startsOn <= date).sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
}

export function walkingTargetForDay(targets: WalkingTarget[], date: string) {
  const target = walkingTargetOn(targets, date);
  if (!target?.active) return undefined;
  if (!target.dailyTargets) return target;
  const index = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${target.startsOn}T12:00:00Z`)) / 86400000);
  const amount = target.dailyTargets[index];
  return amount == null ? undefined : { ...target, amount };
}

/** Keep MySQL DATE values as calendar dates, never shift them through UTC. */
export function walkingTargetFromRow(row: Record<string, unknown>): WalkingTarget {
  const date = row.starts_on;
  const startsOn = date instanceof Date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : String(date).slice(0, 10);
  return { id: Number(row.id), unit: row.unit as WalkingTarget["unit"], amount: Number(row.amount), startsOn,
    active: Boolean(row.active), notes: String(row.notes || ""),
    dailyTargets: typeof row.daily_targets === "string" ? JSON.parse(row.daily_targets) : row.daily_targets as WalkingTarget["dailyTargets"] };
}

export function walkingDays(targets: WalkingTarget[], logs: WalkingLog[], today: string): WalkingDay[] {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const days: WalkingDay[] = [];
  for (let offset = 0; offset < 30; offset++) {
    const date = shiftWalkingDate(today, -offset);
    const target = walkingTargetForDay(targets, date);
    if (!target?.active) continue;
    const log = byDate.get(date);
    const percent = Math.floor((log?.amount ?? 0) / target.amount * 100);
    const status = log && log.amount >= target.amount ? "met" : date === today ? "pending" : log ? "below" : "missing";
    days.push({ date, target, log, percent, status });
  }
  return days;
}
