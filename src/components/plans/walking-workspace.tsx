"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Footprints, Plus, Save, Target } from "lucide-react";
import { saveWalkingLogAction, saveWalkingTargetAction, type WalkingState } from "@/app/actions/walking";
import { shiftWalkingDate, walkingTargetForDay, type WalkingDay, type WalkingTarget } from "@/lib/walking";
import { Badge, Card } from "@/components/dashboard/primitives";
import { FormDialog } from "@/components/dashboard/form-dialog";

function Feedback({ state }: { state: WalkingState }) {
  const t = useTranslations("Walking");
  return <>{state.error && <p className="account-form-message error" role="alert">{t(state.error)}</p>}{state.success && <p className="account-form-message success" role="status">{t("saved")}</p>}</>;
}

export function WalkingClientScope({ clients, selectedId, children }: { clients: Array<{ id: number; name: string; email: string }>; selectedId: number; children: ReactNode }) {
  const t = useTranslations("Walking");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selected = clients.find((client) => client.id === selectedId)!;
  return <>
    <div className="form-grid walking-client-picker"><label><span>{t("client")}</span><select value={selectedId} disabled={pending} onChange={(event) => {
      const id = event.target.value;
      startTransition(() => router.push(`/coach/workout-plans?client=${id}`));
    }}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}</select></label></div>
    <p className="walking-selected-client" role="status">{pending ? t("loadingClient") : t("assignedFor", { name: selected.name, email: selected.email })}</p>
    <fieldset disabled={pending} className="walking-client-content" aria-busy={pending}>{children}</fieldset>
  </>;
}

export function WalkingTargetForm({ clientId, earliest, initial }: { clientId: number; earliest: string; initial?: WalkingTarget }) {
  const t = useTranslations("Walking");
  const format = useFormatter();
  const [unit, setUnit] = useState<WalkingTarget["unit"]>(initial?.unit || "steps");
  const [startsOn, setStartsOn] = useState(initial && initial.startsOn >= earliest ? initial.startsOn : earliest);
  const [baseAmount, setBaseAmount] = useState(String(initial?.amount || 10000));
  const [days, setDays] = useState(() => (initial?.dailyTargets || Array<number>(7).fill(initial?.amount || 10000)).map((amount) => ({ enabled: amount !== null, amount: String(amount ?? initial?.amount ?? 10000) })));
  const [state, action, pending] = useActionState(saveWalkingTargetAction, {});
  return <form action={action} className="form-grid walking-form">
    <input type="hidden" name="client_id" value={clientId} />
    <input type="hidden" name="daily_targets" value={JSON.stringify(days.map((day) => day.enabled ? Number(day.amount) : null))} />
    <label><span>{t("unit")}</span><select name="unit" value={unit} onChange={(event) => {
      const nextUnit = event.target.value as WalkingTarget["unit"];
      const amount = nextUnit === "steps" ? "10000" : "5";
      setUnit(nextUnit); setBaseAmount(amount); setDays(days.map((day) => ({ ...day, amount })));
    }}><option value="steps">{t("steps")}</option><option value="km">{t("km")}</option></select></label>
    <label><span>{t("defaultTarget")}</span><input name="amount" type="number" inputMode={unit === "steps" ? "numeric" : "decimal"} min={unit === "steps" ? 1 : 0.01} max={unit === "steps" ? 100000 : 100} step={unit === "steps" ? 1 : 0.01} value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} required /></label>
    <label><span>{t("startsOn")}</span><input name="starts_on" type="date" min={earliest} value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required /></label>
    <label><span>{t("duration")}</span><input type="number" min={1} max={90} step={1} defaultValue={days.length} required onChange={(event) => {
      const count = Number(event.target.value);
      if (Number.isInteger(count) && count >= 1 && count <= 90) setDays(Array.from({ length: count }, (_, index) => days[index] || { enabled: true, amount: baseAmount }));
    }} /></label>
    <label><span>{t("status")}</span><select name="active" defaultValue={initial?.active === false ? "false" : "true"}><option value="true">{t("active")}</option><option value="false">{t("paused")}</option></select></label>
    <div className="walking-full walking-day-builder"><div className="walking-heading"><h4>{t("chooseDays")}</h4><button type="button" className="button secondary" onClick={() => setDays(days.map((day) => ({ ...day, amount: baseAmount })))}>{t("applyAll")}</button></div><p className="walking-muted">{t("daysHint")}</p>
      <div className="walking-day-inputs">{days.map((day, index) => {
        const date = startsOn && /^\d{4}-\d{2}-\d{2}$/.test(startsOn) ? shiftWalkingDate(startsOn, index) : "";
        const label = date ? format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : t("dayNumber", { count: index + 1 });
        return <div className="walking-day-input" key={index}>
          <label className="walking-day-check"><input type="checkbox" checked={day.enabled} onChange={(event) => setDays(days.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item))} /><span>{label}</span></label>
          {day.enabled ? <label className="walking-day-amount"><span>{t(unit)}</span><input aria-label={t("dayTarget", { date: label, unit: t(unit) })} type="number" min={unit === "steps" ? 1 : 0.01} max={unit === "steps" ? 100000 : 100} step={unit === "steps" ? 1 : 0.01} inputMode={unit === "steps" ? "numeric" : "decimal"} value={day.amount} required onChange={(event) => setDays(days.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))} /></label> : <span className="walking-muted">{t("restDay")}</span>}
        </div>;
      })}</div>
    </div>
    <p className="walking-full walking-muted">{t("unitsHint")}</p>
    <label className="walking-full"><span>{t("coachNotes")}</span><textarea name="notes" rows={3} maxLength={1000} defaultValue={initial?.notes || ""} placeholder={t("notesPlaceholder")} /></label>
    <div className="walking-full"><Feedback state={state} /><button className="button primary" type="submit" disabled={pending}><Save size={16} />{t(pending ? "saving" : "saveTarget")}</button></div>
  </form>;
}

export function WalkingSchedule({ targets, today }: { targets: WalkingTarget[]; today: string }) {
  const t = useTranslations("Walking");
  const format = useFormatter();
  if (!targets.length) return null;
  return <Card className="walking-schedule"><h2>{t("assignedSchedule")}</h2><p className="walking-muted">{t("scheduleHint")}</p><div className="walking-schedule-days">{Array.from({ length: 7 }, (_, index) => {
    const date = shiftWalkingDate(today, index);
    const target = walkingTargetForDay(targets, date);
    return <div key={date} className={index === 0 ? "is-today" : ""}><time dateTime={date}>{format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</time><strong>{target ? `${format.number(target.amount)} ${t(target.unit)}` : t("noWalking")}</strong></div>;
  })}</div>
    <div className="walking-plan-details">{targets.slice().sort((a, b) => b.startsOn.localeCompare(a.startsOn)).map((plan) => <details key={plan.id}><summary>{plan.startsOn}{plan.dailyTargets ? ` → ${shiftWalkingDate(plan.startsOn, plan.dailyTargets.length - 1)}` : ` · ${t("ongoing")}`} · {t(plan.active ? "active" : "paused")}</summary>
      {plan.notes && <p className="walking-note">{plan.notes}</p>}
      {plan.dailyTargets ? <ol>{plan.dailyTargets.map((amount, index) => <li key={index}><time>{shiftWalkingDate(plan.startsOn, index)}</time><strong>{amount === null ? t("restDay") : `${format.number(amount)} ${t(plan.unit)}`}</strong></li>)}</ol> : <p>{format.number(plan.amount)} {t(plan.unit)} · {t("everyDay")}</p>}
    </details>)}</div>
  </Card>;
}

function WalkingLogForm({ day, mode }: { day: WalkingDay; mode: "add" | "replace" }) {
  const t = useTranslations("Walking");
  const router = useRouter();
  const [amount, setAmount] = useState(mode === "replace" ? String(day.log?.amount ?? 0) : "");
  const [expected, setExpected] = useState(day.log?.amount ?? 0);
  const [notes, setNotes] = useState(mode === "replace" ? day.log?.notes || "" : "");
  const [state, action, pending] = useActionState(async (previous: WalkingState, form: FormData) => {
    const result = await saveWalkingLogAction(previous, form);
    if (result.success) { setExpected(result.total!); setAmount(mode === "add" ? "" : String(result.total)); if (mode === "add") setNotes(""); }
    if (result.error === "logChanged") router.refresh();
    return result;
  }, {});
  return <form action={action} className="form-grid walking-form">
    <input type="hidden" name="date" value={day.date} /><input type="hidden" name="target_id" value={day.target.id} />
    <input type="hidden" name="mode" value={mode} /><input type="hidden" name="expected_amount" value={expected} />
    <p className="walking-full walking-note">{t("recordedSoFar", { amount: expected.toLocaleString(), unit: t(day.target.unit) })} · {t("targetLabel", { amount: day.target.amount.toLocaleString(), unit: t(day.target.unit) })}</p>
    <label className="walking-full"><span>{t(mode === "add" ? "walkAmount" : "dailyTotal", { unit: t(day.target.unit) })}</span><input name="amount" type="number" inputMode={day.target.unit === "steps" ? "numeric" : "decimal"} min={0} max={day.target.unit === "steps" ? 100000 : 100} step={day.target.unit === "steps" ? 1 : 0.01} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={day.target.unit === "steps" ? "2000" : "1.50"} required aria-describedby="walking-total-hint" disabled={pending} /></label>
    <p id="walking-total-hint" className="walking-full walking-muted">{t(mode === "add" ? "addHint" : "totalHint")}</p>
    <label className="walking-full"><span>{t("clientNotes")}</span><textarea name="notes" rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={pending} /></label>
    <div className="walking-full"><Feedback state={state} />{state.success && state.total !== undefined && <p className="walking-note" role="status">{state.total >= (state.target ?? Infinity) ? `🎉 ${t(state.total > state.target! ? "exceededPraise" : "metPraise")} ` : ""}{t("recordedSoFar", { amount: state.total.toLocaleString(), unit: t(day.target.unit) })}</p>}<button type="submit" className="button primary" disabled={pending || state.error === "logChanged"}><Save size={16} />{t(pending ? "saving" : mode === "add" ? "addWalk" : "updateLog")}</button></div>
  </form>;
}

export function WalkingProgress({ days, today, coach = false }: { days: WalkingDay[]; today: string; coach?: boolean }) {
  const t = useTranslations("Walking");
  const format = useFormatter();
  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode] = useState<"add" | "replace" | null>(null);
  const selected = days.find((day) => day.date === selectedDate) || days[0];
  const current = days.find((day) => day.date === today);
  const past = days.filter((day) => day.date < today);
  const met = past.filter((day) => day.status === "met").length;
  const missing = past.filter((day) => day.status === "missing").length;
  const number = (value: number) => format.number(value, { maximumFractionDigits: 2 });
  const date = (value: string) => format.dateTime(new Date(`${value}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" });
  return <>
    {!coach && selected && <div className="walking-heading"><span className="walking-muted">{t("addHint")}</span><button className="button primary" type="button" onClick={() => { setSelectedDate(current?.date || selected.date); setMode("add"); }}><Plus size={18} />{t("addWalk")}</button></div>}
    {current && <Card className="walking-today">
      <div className="walking-heading"><span className="eyebrow">{t("today")} · {date(today)}</span><Footprints size={24} aria-hidden="true" /></div>
      <div className="walking-total"><strong>{number(current.log?.amount ?? 0)}</strong><span>/ {number(current.target.amount)} {t(current.target.unit)}</span></div>
      <progress className="walking-meter" max={100} value={Math.min(100, current.percent)} aria-label={t("dailyProgress")} />
      <div className="walking-heading"><span>{current.status === "met" ? t("met") : t("remaining", { amount: number(Math.max(0, current.target.amount - (current.log?.amount ?? 0))), unit: t(current.target.unit) })}</span><Badge tone={current.status === "met" ? "success" : "neutral"}>{current.log ? `${current.percent}%` : t("notLogged")}</Badge></div>
      {current.target.notes && <p className="walking-note">{current.target.notes}</p>}
      {!coach && current.status === "met" && <p className="walking-celebration">🎉 {t((current.log?.amount ?? 0) > current.target.amount ? "exceededPraise" : "metPraise")}</p>}
    </Card>}
    <div className="walking-stats"><Card><Target size={18} aria-hidden="true" /><strong>{met} / {past.length}</strong><span>{t("daysMet")}</span></Card><Card><Check size={18} aria-hidden="true" /><strong>{past.length ? `${Math.round(met / past.length * 100)}%` : "—"}</strong><span>{t("adherence")}</span></Card><Card><Footprints size={18} aria-hidden="true" /><strong>{missing}</strong><span>{t("unloggedDays")}</span></Card></div>
    <p className="walking-muted">{t("statsHint")}</p>
    {!coach && selected && mode && <FormDialog title={t(mode === "add" ? "logTitle" : "edit")} onClose={() => setMode(null)}>
      <p className="walking-muted">{t(mode === "add" ? "selfReported" : "totalHint")}</p>
      <div className="form-grid walking-date-picker"><label><span>{t("date")}</span><select value={selected.date} onChange={(event) => setSelectedDate(event.target.value)}>{days.map((day) => <option value={day.date} key={day.date}>{day.date === today ? t("today") : date(day.date)} · {number(day.target.amount)} {t(day.target.unit)}</option>)}</select></label></div>
      <WalkingLogForm key={`${selected.date}-${selected.target.id}-${mode}`} day={selected} mode={mode} />
    </FormDialog>}
    <Card className="walking-history"><div className="walking-heading"><div><h2>{t("history")}</h2><p>{t("historyHint")}</p></div><Badge>{t("last30")}</Badge></div>
      {days.length === 0 ? <p className="walking-muted">{t("noHistory")}</p> : <ul>{days.map((day) => <li key={day.date}>
        <div><strong>{day.date === today ? t("today") : date(day.date)}</strong><small>{day.date}</small></div>
        <div className="walking-day-total"><strong>{day.log ? number(day.log.amount) : "—"} <small>{t(day.target.unit)}</small></strong><small>{t("targetLabel", { amount: number(day.target.amount), unit: t(day.target.unit) })}</small></div>
        <Badge tone={day.status === "met" ? "success" : day.status === "below" || day.status === "missing" ? "warning" : "neutral"}>{t(day.status)}</Badge>
        {!coach && <div className="walking-row-actions"><button className="button secondary" type="button" onClick={() => { setSelectedDate(day.date); setMode("add"); }}>{t("addWalk")}</button>{day.log && <button className="text-button" type="button" onClick={() => { setSelectedDate(day.date); setMode("replace"); }}>{t("edit")}</button>}</div>}
        {day.log?.notes && <p className="walking-day-note">{day.log.notes}</p>}
      </li>)}</ul>}
    </Card>
  </>;
}
