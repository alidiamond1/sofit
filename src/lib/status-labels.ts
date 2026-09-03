// Shared status/pipeline-stage vocabulary used across the coach dashboard
// (client status, pipeline stage, consultation/session/check-in/invoice
// status, etc). Translated via the `Common.status.*` message namespace.
//
// Safe to import from both server and client components — it's a pure
// mapping function, no "use client" needed.

const STATUS_KEYS: Record<string, string> = {
  active: "active",
  paused: "paused",
  churned: "churned",
  lead: "lead",
  onboarding: "onboarding",
  renewal: "renewal",
  pending: "pending",
  submitted: "submitted",
  reviewed: "reviewed",
  scheduled: "scheduled",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "noShow",
  attended: "attended",
  draft: "draft",
  paid: "paid",
  unpaid: "unpaid",
  overdue: "overdue",
  approved: "approved",
  rejected: "rejected",
  archived: "archived",
};

/** Translate a known status/pipeline-stage enum value via a translator for
 *  the `Common.status` namespace (e.g. `useTranslations("Common.status")` or
 *  `await getTranslations("Common.status")`). Falls back to the raw value
 *  for anything not in the map, so this never throws on an unexpected
 *  string (e.g. free-form or future values). */
export function statusLabel(t: (key: string) => string, value: string): string {
  const key = STATUS_KEYS[value];
  return key ? t(key) : value;
}

const DIFFICULTY_KEYS = ["beginner", "intermediate", "advanced"];

/** Translate an exercise's fixed `difficulty` enum via a translator for the
 *  `Packages.exerciseLibrary` namespace (which defines beginner/intermediate/
 *  advanced). Falls back to the raw value for anything unexpected. */
export function difficultyLabel(t: (key: string) => string, value: string): string {
  return DIFFICULTY_KEYS.includes(value) ? t(value) : value;
}
