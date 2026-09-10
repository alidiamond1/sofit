"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, ReceiptText, Search, SlidersHorizontal, X } from "lucide-react";
import { Avatar, Badge, Card, PageHeader, StatCard } from "@/components/dashboard/primitives";
import { filterCoachInvoices, invoiceCsvCell, invoiceStatus, type CoachInvoice } from "@/lib/payments/coach-invoices";

export function CoachPaymentsWorkspace({ invoices, today }: { invoices: CoachInvoice[]; today: string }) {
  const t = useTranslations("CoachBilling");
  const locale = useLocale();
  const currencies = [...new Set(invoices.map((row) => row.currency))].sort();
  if (!currencies.length) currencies.push("USD");
  const defaults = { search: "", status: "", interval: "", packageName: "", currency: currencies.includes("USD") ? "USD" : currencies[0], from: "", to: "" };
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CoachInvoice | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = filterCoachInvoices(invoices, filters, today);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  const paid = filtered.filter((row) => row.status === "paid");
  const outstanding = filtered.filter((row) => ["unpaid", "overdue"].includes(row.status));
  const money = (cents: number, currency = filters.currency) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "—";
  const interval = (value: string) => t(["monthly", "quarterly", "one_time"].includes(value) ? value : "unknown");
  const statusBadge = (row: CoachInvoice) => {
    const status = invoiceStatus(row, today);
    return <Badge tone={status === "paid" ? "success" : status === "overdue" ? "danger" : status === "unpaid" ? "warning" : "neutral"}>{t(status)}</Badge>;
  };
  const update = (key: keyof typeof filters, value: string) => { setFilters({ ...filters, [key]: value }); setPage(1); };
  const reset = () => { setFilters(defaults); setPage(1); };
  const openDetails = (row: CoachInvoice) => { setSelected(row); dialog.current?.showModal(); };
  function exportCsv() {
    const records = [[t("invoice"), t("client"), t("email"), t("package"), t("billing"), t("amount"), t("currency"), t("status"), t("created"), t("due"), t("paidOn"), t("accessUntil"), t("reference")],
      ...filtered.map((row) => [row.number, row.client, row.email, row.packageName, interval(row.interval), (row.cents / 100).toFixed(2), row.currency, t(invoiceStatus(row, today)), row.created, row.due, row.paidAt || "", row.accessUntil || "", row.providerReference || ""])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + records.map((row) => row.map(invoiceCsvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `sofit-payments-${today}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="coach-billing">
    <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} actions={<button className="button secondary" onClick={exportCsv} disabled={!filtered.length}><ArrowDownToLine size={16} />{t("export")}</button>} />
    <div className="coach-billing-stats">
      <StatCard label={t("collected")} value={money(paid.reduce((sum, row) => sum + row.cents, 0))} note={t("paidCount", { count: paid.length })} icon={<CheckCircle2 size={19} />} accent="green" />
      <StatCard label={t("outstanding")} value={money(outstanding.reduce((sum, row) => sum + row.cents, 0))} note={t("overdueCount", { count: outstanding.filter((row) => invoiceStatus(row, today) === "overdue").length })} icon={<Clock3 size={19} />} accent="amber" />
      <StatCard label={t("payingClients")} value={String(new Set(paid.map((row) => row.clientId)).size)} note={t("payingHint")} icon={<CircleDollarSign size={19} />} accent="green" />
    </div>
    <p className="coach-billing-scope">{t("scope")}</p>
    <Card className="coach-billing-ledger">
      <header className="coach-billing-ledger-head"><div><h2>{t("ledger")}</h2><p>{t("ledgerHint")}</p></div><span className="billing-icon"><ReceiptText size={22} /></span></header>
      <div className="coach-billing-filterbar"><label className="coach-billing-search"><Search size={17} /><span className="sr-only">{t("search")}</span><input type="search" placeholder={t("search")} value={filters.search} onChange={(event) => update("search", event.target.value)} /></label>
        <label>{t("status")}<select value={filters.status} onChange={(event) => update("status", event.target.value)}><option value="">{t("allStatuses")}</option>{["paid", "unpaid", "overdue", "draft", "void"].map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></label>
        <label>{t("billing")}<select value={filters.interval} onChange={(event) => update("interval", event.target.value)}><option value="">{t("allPlans")}</option>{["monthly", "quarterly", "one_time", "unknown"].map((value) => <option key={value} value={value}>{interval(value)}</option>)}</select></label>
        <label>{t("package")}<select value={filters.packageName} onChange={(event) => update("packageName", event.target.value)}><option value="">{t("allPackages")}</option>{[...new Set(invoices.map((row) => row.packageName))].sort().map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>
      <div className="coach-billing-dates"><SlidersHorizontal size={16} aria-hidden="true" /><label>{t("from")}<input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => update("from", event.target.value)} /></label><label>{t("to")}<input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => update("to", event.target.value)} /></label>
        {currencies.length > 1 && <label>{t("currency")}<select value={filters.currency} onChange={(event) => update("currency", event.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>}
        <button className="button ghost" onClick={reset}>{t("reset")}</button><span role="status">{t("results", { count: filtered.length })}</span>
      </div>
      {visible.length ? <div className="coach-billing-table-wrap"><table className="coach-billing-table"><thead><tr>{["client", "package", "amount", "status", "due", "details"].map((key) => <th key={key} scope="col">{t(key)}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.id}>
        <td><Link href={`/coach/clients?client=${row.clientId}`} className="coach-billing-client"><Avatar name={row.client} /><span><strong>{row.client}</strong><small>{row.email}</small></span></Link></td>
        <td><strong>{row.packageName}</strong><small className="coach-billing-cycle">{interval(row.interval)}</small></td>
        <td className="coach-billing-amount"><strong>{money(row.cents, row.currency)}</strong><small>{row.currency}</small></td>
        <td>{statusBadge(row)}</td><td><span>{date(row.due)}</span><small>{row.paidAt ? t("paidDate", { date: date(row.paidAt) }) : t("createdDate", { date: date(row.created) })}</small></td>
        <td><button className="coach-billing-view" onClick={() => openDetails(row)} aria-label={t("viewInvoice", { number: row.number })}>{t("view")}<ArrowUpRight size={15} /></button></td>
      </tr>)}</tbody></table></div> : <div className="coach-billing-empty"><ReceiptText size={30} /><h3>{t("empty")}</h3><p>{invoices.length ? t("emptyHint") : t("noInvoices")}</p>{invoices.length > 0 && <button className="button secondary" onClick={reset}>{t("reset")}</button>}</div>}
      <footer className="coach-billing-pagination"><span>{t("page", { current: currentPage, total: pageCount })}</span><div><button className="icon-button" aria-label={t("previous")} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><button className="icon-button" aria-label={t("next")} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div></footer>
    </Card>
    <dialog ref={dialog} className="coach-billing-dialog" aria-labelledby="coach-invoice-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {selected && <><header><span className="billing-icon"><ReceiptText size={24} /></span><button className="icon-button" aria-label={t("close")} onClick={() => dialog.current?.close()}><X size={18} /></button></header><p className="eyebrow">{t("invoice")}</p><h2 id="coach-invoice-title">{selected.packageName}</h2><p className="coach-billing-reference">{selected.number}</p><div className="coach-billing-dialog-amount"><strong>{money(selected.cents, selected.currency)}</strong>{statusBadge(selected)}</div>
        <dl>{[[t("client"), selected.client], [t("email"), selected.email], [t("billing"), interval(selected.interval)], [t("created"), date(selected.created)], [t("due"), date(selected.due)], [t("paidOn"), date(selected.paidAt)], [t("accessUntil"), date(selected.accessUntil)], [t("reference"), selected.providerReference || t("notRecorded")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <Link href={`/coach/clients?client=${selected.clientId}`} className="button primary">{t("viewClient")}<ArrowUpRight size={16} /></Link></>}
    </dialog>
  </div>;
}
