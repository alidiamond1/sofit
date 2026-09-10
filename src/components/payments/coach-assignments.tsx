"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Search } from "lucide-react";
import { Avatar, Badge, Card, PageHeader, StatCard } from "@/components/dashboard/primitives";
import type { CoachInvoice } from "@/lib/payments/coach-invoices";

export function CoachAssignmentsWorkspace({ invoices }: { invoices: CoachInvoice[] }) {
  const t = useTranslations("Assignments");
  const tb = useTranslations("CoachBilling");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [scope, setScope] = useState("current");
  const [page, setPage] = useState(1);
  const current = invoices.filter((row) => row.assignment?.current);
  const filtered = invoices.filter((row) => (scope === "all" || row.assignment?.current)
    && (!state || row.assignment?.state === state)
    && [row.client, row.email, row.packageName, row.number].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const activePage = Math.min(page, pages);
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : t("notOpened");
  const reset = () => { setSearch(""); setState(""); setScope("current"); setPage(1); };
  return <div className="coach-billing">
    <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} actions={<Link href="/coach/packages" className="button primary">{t("assignPackage")}<ArrowUpRight size={16} /></Link>} />
    <div className="coach-billing-stats">
      <StatCard label={t("current")} value={String(current.length)} note={t("currentHint")} icon={<ClipboardCheck size={19} />} accent="green" />
      <StatCard label={t("awaitingPayment")} value={String(current.filter((row) => ["unpaid", "overdue"].includes(row.status)).length)} note={t("pendingHint")} icon={<Clock3 size={19} />} accent="amber" />
      <StatCard label={t("active")} value={String(current.filter((row) => row.assignment?.state === "active").length)} note={t("activeHint")} icon={<CheckCircle2 size={19} />} accent="green" />
    </div>
    <p className="coach-billing-scope">{t("viewedHint")}</p>
    <Card className="coach-billing-ledger">
      <header className="coach-billing-ledger-head"><div><h2>{t("tracker")}</h2><p>{t("trackerHint")}</p></div><Badge>{filtered.length}</Badge></header>
      <div className="coach-billing-filterbar assignment-filters">
        <label className="coach-billing-search"><Search size={17} /><span className="sr-only">{tb("search")}</span><input type="search" value={search} placeholder={tb("search")} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <label>{tb("status")}<select value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}><option value="">{tb("allStatuses")}</option>{["awaitingPayment", "active", "paused", "expired", "replaced"].map((value) => <option value={value} key={value}>{t(value)}</option>)}</select></label>
        <label>{t("show")}<select value={scope} onChange={(event) => { setScope(event.target.value); setPage(1); }}><option value="current">{t("current")}</option><option value="all">{t("allHistory")}</option></select></label>
        <button className="button ghost" onClick={reset}>{tb("reset")}</button>
      </div>
      {filtered.length ? <div className="coach-billing-table-wrap"><table className="coach-billing-table assignment-table"><thead><tr>{[tb("client"), tb("package"), t("assigned"), t("opened"), t("paymentAccess"), tb("details")].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{filtered.slice((activePage - 1) * 12, activePage * 12).map((row) => <tr key={row.id}>
        <td><Link href={`/coach/clients?client=${row.clientId}`} className="coach-billing-client"><Avatar name={row.client} /><span><strong>{row.client}</strong><small>{row.email}</small></span></Link></td>
        <td><strong>{row.packageName}</strong><small>{new Intl.NumberFormat(locale, { style: "currency", currency: row.currency }).format(row.cents / 100)} · {tb(["monthly", "quarterly", "one_time"].includes(row.interval) ? row.interval : "unknown")}</small></td>
        <td><span>{date(row.created)}</span><small className="assignment-reference">{row.number}</small></td>
        <td><Badge tone={row.assignment?.viewedAt ? "success" : "neutral"}>{row.assignment?.viewedAt ? t("opened") : t("notOpened")}</Badge>{row.assignment?.viewedAt && <small>{date(row.assignment.viewedAt)}</small>}</td>
        <td><Badge tone={row.assignment?.state === "active" ? "success" : row.assignment?.state === "awaitingPayment" ? "warning" : "neutral"}>{t(row.assignment!.state)}</Badge><small>{row.paidAt ? `${tb("paidOn")} ${date(row.paidAt)}` : tb(row.status)}{row.accessUntil ? ` · ${tb("accessUntil")} ${date(row.accessUntil)}` : ""}</small></td>
        <td><Link href={`/coach/clients?client=${row.clientId}`} className="coach-billing-view">{tb("viewClient")}<ArrowUpRight size={15} /></Link></td>
      </tr>)}</tbody></table></div> : <div className="coach-billing-empty"><ClipboardCheck size={28} /><h3>{t("empty")}</h3><p>{t("emptyHint")}</p></div>}
      <footer className="coach-billing-pagination"><span role="status">{tb("page", { current: activePage, total: pages })} · {t("count", { count: filtered.length })}</span><div><button className="icon-button" aria-label={tb("previous")} disabled={activePage === 1} onClick={() => setPage(activePage - 1)}><ChevronLeft size={17} /></button><button className="icon-button" aria-label={tb("next")} disabled={activePage === pages} onClick={() => setPage(activePage + 1)}><ChevronRight size={17} /></button></div></footer>
    </Card>
  </div>;
}
