export type CoachInvoice = {
  id: number; clientId: number; client: string; email: string; number: string;
  packageName: string; interval: string; cents: number; currency: string; status: string;
  created: string; due: string; paidAt: string | null; accessUntil: string | null;
  providerReference: string | null;
};

export function invoiceStatus(row: Pick<CoachInvoice, "status" | "due">, today: string) {
  return row.status === "unpaid" && row.due < today ? "overdue" : row.status;
}

export function filterCoachInvoices(rows: CoachInvoice[], filters: {
  search: string; status: string; interval: string; packageName: string; currency: string; from: string; to: string;
}, today: string) {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter((row) => (!search || [row.client, row.email, row.number, row.packageName].some((value) => value.toLocaleLowerCase().includes(search)))
    && (!filters.status || invoiceStatus(row, today) === filters.status)
    && (!filters.interval || row.interval === filters.interval)
    && (!filters.packageName || row.packageName === filters.packageName)
    && row.currency === filters.currency
    && (!filters.from || row.created >= filters.from)
    && (!filters.to || row.created <= filters.to));
}

export function invoiceCsvCell(value: string | number) {
  const text = String(value);
  // Spreadsheet programs interpret formulas even in quoted CSV cells.
  return `"${(/^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
