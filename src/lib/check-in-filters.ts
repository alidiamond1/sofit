import type { CheckInRow } from "../components/dashboard/coach-check-ins";

export function filterCheckIns<T extends Pick<CheckInRow, "client" | "status" | "weekOf">>(
  rows: T[],
  { search, status, month }: { search: string; status: string; month: string },
): T[] {
  const query = search.trim().toLowerCase();
  return rows.filter((row) =>
    row.client.toLowerCase().includes(query)
    && (!status || row.status === status)
    && (!month || row.weekOf.startsWith(`${month}-`)),
  );
}
