// Weekly scheduling helpers — pure functions, safe to import from both
// server actions and client components (no "server-only" here).

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** 0 = Monday … 6 = Sunday, resolved in `tz` when given (else server local). */
export function weekdayIndex(tz?: string, date = new Date()): number {
  if (tz) {
    try {
      const short = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
      const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      if (short in map) return map[short];
    } catch { /* fall back to server local */ }
  }
  return (date.getDay() + 6) % 7;
}

/** YYYY-MM-DD in `tz` when given (else server local). */
export function todayISO(tz?: string, date = new Date()): string {
  if (tz) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    } catch { /* fall back to server local */ }
  }
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export type ScheduledExercise = {
  key: string;
  name: string;
  muscleGroup: string;
  mediaUrl: string | null;
  sets: string;
  reps: string;
  rpe: string;
  restSeconds: number;
  instructions: string | null;
  equipment: string;
  difficulty: string;
};

export function jsonArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** The exercises for one day of a plan, in a stable order. `key` is the index
 *  within the filtered day list — server + client derive it identically, so
 *  per-exercise completion toggles line up. */
export function exercisesForDay(planExercises: unknown, dayLabel: string | null): ScheduledExercise[] {
  const all = jsonArray(planExercises);
  const filtered = dayLabel ? all.filter((exercise) => String(exercise.day ?? "") === dayLabel) : all;
  return filtered.map((exercise, index) => ({
    key: String(exercise.exercise_id ?? index),
    name: String(exercise.exercise || "Exercise"),
    muscleGroup: String(exercise.muscle_group || ""),
    mediaUrl: exercise.media_url ? String(exercise.media_url) : null,
    sets: String(exercise.sets ?? "-"),
    reps: String(exercise.reps ?? "-"),
    rpe: String(exercise.rpe ?? "-"),
    restSeconds: Number(exercise.rest_seconds ?? 0),
    instructions: exercise.instructions ? String(exercise.instructions) : null,
    equipment: exercise.equipment ? String(exercise.equipment) : "Bodyweight",
    difficulty: exercise.difficulty ? String(exercise.difficulty) : "beginner",
  }));
}

/** Distinct day labels within a plan's exercises (its split). */
export function planDays(planExercises: unknown): string[] {
  const all = jsonArray(planExercises);
  return [...new Set(all.map((exercise) => String(exercise.day ?? "")).filter(Boolean))];
}
