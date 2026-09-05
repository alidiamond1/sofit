/** The Monday-anchored ISO date used as `check_ins.week_of`. Shared between the
 *  submit action (which needs it as a write key) and the check-in page (which
 *  needs it to know whether an existing row is *this* week's, for photo prefill). */
export function currentWeekStart(): string {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}
