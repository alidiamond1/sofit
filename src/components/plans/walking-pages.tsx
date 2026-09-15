import { Footprints } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { todayISO } from "@/lib/schedule";
import { shiftWalkingDate, walkingDays, walkingTargetOn, walkingTargetForDay, walkingTargetFromRow, type WalkingLog } from "@/lib/walking";
import { Card, PageHeader } from "@/components/dashboard/primitives";
import { WalkingClientScope, WalkingProgress, WalkingSchedule, WalkingTargetForm } from "./walking-workspace";

export async function walkingData(clientId: number, userId: number) {
  const db = database();
  const settings = await db("user_settings").select("timezone").where({ user_id: userId }).first();
  const timezone = String(settings?.timezone || "Africa/Nairobi");
  const today = todayISO(timezone);
  const [targetRows, logRows] = await Promise.all([
    db("walking_targets").where({ client_id: clientId }).orderBy("starts_on", "desc"),
    db("walking_logs").select("amount", "notes", db.raw("DATE_FORMAT(logged_on, '%Y-%m-%d') as log_date"))
      .where({ client_id: clientId }).whereBetween("logged_on", [shiftWalkingDate(today, -29), today]),
  ]);
  const targets = targetRows.map(walkingTargetFromRow);
  const logs: WalkingLog[] = logRows.map((row) => ({ date: String(row.log_date), amount: Number(row.amount), notes: String(row.notes) }));
  return { targets, days: walkingDays(targets, logs, today), today, timezone };
}

export async function CoachWalking({ selectedClientId }: { selectedClientId?: number | null }) {
  await requireRole("coach");
  const t = await getTranslations("Walking");
  const clients = await database()("clients").join("users", "users.id", "clients.user_id")
    .select("clients.id", "clients.user_id", "users.name", "users.email").whereNot("clients.status", "churned").orderBy("users.name");
  const client = clients.find((row) => Number(row.id) === selectedClientId) || clients[0];
  if (!client) return <Card className="empty-state"><Footprints size={28} /><h2>{t("noClients")}</h2></Card>;
  const data = await walkingData(Number(client.id), Number(client.user_id));
  const current = walkingTargetOn(data.targets, data.today);
  const todayTarget = walkingTargetForDay(data.targets, data.today);
  const earliest = current ? shiftWalkingDate(data.today, 1) : data.today;
  const next = data.targets.filter((target) => target.startsOn > data.today).reverse();
  return <div className="walking-workspace">
    <div className="walking-heading"><div><span className="eyebrow">{t("dailyHabit")}</span><h2>{t("coachTitle")}</h2><p>{t("coachHint")}</p></div><Footprints size={30} aria-hidden="true" /></div>
    <WalkingClientScope selectedId={Number(client.id)} clients={clients.map((row) => ({ id: Number(row.id), name: String(row.name), email: String(row.email) }))}>
    <div className="walking-coach-grid">
      <Card className="walking-target-card"><h3>{t("setTarget")}</h3><p className="walking-muted">{t("historySafe")}</p>
        <WalkingTargetForm key={client.id} clientId={Number(client.id)} earliest={earliest} initial={next[0] || current} />
      </Card>
      <div className="walking-stack"><Card className="walking-summary"><span className="eyebrow">{t("currentTarget")}</span><h3>{todayTarget ? `${todayTarget.amount.toLocaleString()} ${t(todayTarget.unit)}` : t("noWalking")}</h3><small>{t("timezone", { timezone: data.timezone })}</small>{current?.notes && <p className="walking-note">{current.notes}</p>}</Card>
        {next.length > 0 && <Card className="walking-upcoming"><h3>{t("upcoming")}</h3>{next.map((target) => <div key={target.id}><time dateTime={target.startsOn}>{target.startsOn}</time><strong>{target.active ? `${target.amount.toLocaleString()} ${t(target.unit)}` : t("paused")}</strong></div>)}</Card>}
      </div>
    </div>
    <WalkingSchedule targets={data.targets} today={data.today} />
    <WalkingProgress days={data.days} today={data.today} coach />
    </WalkingClientScope>
  </div>;
}

export async function ClientWalking() {
  const session = await requireRole("client");
  const t = await getTranslations("Walking");
  const client = await database()("clients").select("id").where({ user_id: session.id }).first();
  if (!client) return <Card className="empty-state"><p>{t("missingClient")}</p></Card>;
  const data = await walkingData(Number(client.id), session.id);
  const current = walkingTargetOn(data.targets, data.today);
  const todayTarget = walkingTargetForDay(data.targets, data.today);
  return <div className="walking-workspace">
    <PageHeader eyebrow={t("dailyHabit")} title={t("title")} description={t("clientHint")} />
    <p className="walking-muted">{t("timezone", { timezone: data.timezone })}</p>
    {!todayTarget && <Card className="empty-state"><Footprints size={32} /><h2>{t(data.targets.length ? current?.active === false ? "paused" : "noWalking" : "noActiveTarget")}</h2><p>{t(data.targets.length ? "seeSchedule" : "emptyHint")}</p></Card>}
    <WalkingProgress days={data.days} today={data.today} />
    <WalkingSchedule targets={data.targets} today={data.today} />
  </div>;
}

export async function ClientWalkingHome({ clientId, userId }: { clientId: number; userId: number }) {
  const t = await getTranslations("Walking");
  const data = await walkingData(clientId, userId);
  if (!data.targets.length) return null;
  const day = data.days.find((entry) => entry.date === data.today);
  return <Card className="walking-home"><Footprints size={26} aria-hidden="true" /><div><span className="eyebrow">{t("currentTarget")}</span><h2>{day ? `${(day.log?.amount ?? 0).toLocaleString()} / ${day.target.amount.toLocaleString()} ${t(day.target.unit)}` : t("noWalking")}</h2><p>{t("homeHint")}</p></div><Link className="button primary" href="/client/walking">{t("viewWalking")}</Link></Card>;
}
