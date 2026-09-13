import { Activity, Ruler, Scale } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { adultBmiEligible, calculateBmi } from "@/lib/body-metrics";
import { Card, PageHeader, StatCard } from "@/components/dashboard/primitives";
import { BodyMetricsForm } from "./body-metrics-form";

export async function BodyMetricsPage() {
  const session = await requireRole("client");
  const t = await getTranslations("BodyMetrics");
  const locale = await getLocale();
  const client = await database()("clients").join("users", "users.id", "clients.user_id")
    .select("clients.*", "users.date_of_birth as user_date_of_birth").where("clients.user_id", session.id).first();
  if (!client) return <Card><p>{t("missingClient")}</p></Card>;
  const checkIns = await database()("check_ins").where({ client_id: client.id })
    .whereIn("status", ["submitted", "reviewed"]).whereNotNull("weight_kg").orderBy("week_of", "desc").limit(12);
  const latest = checkIns[0];
  const weight = latest?.weight_kg ?? client.starting_weight_kg;
  const birth = client.date_of_birth || client.user_date_of_birth;
  const dateOfBirth = birth instanceof Date
    ? `${birth.getFullYear()}-${String(birth.getMonth() + 1).padStart(2, "0")}-${String(birth.getDate()).padStart(2, "0")}`
    : String(birth || "").slice(0, 10);
  const eligible = adultBmiEligible(dateOfBirth);
  const bmi = eligible ? calculateBmi(client.height_cm, weight) : null;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });

  return <>
    <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} actions={<Link href="/client/check-in" className="button secondary">{t("weeklyCheckIn")}</Link>} />
    <div className="stats-grid compact">
      <StatCard label={t("height")} value={client.height_cm ? `${number.format(Number(client.height_cm))} cm` : "—"} icon={<Ruler size={18} />} />
      <StatCard label={t("startingWeight")} value={client.starting_weight_kg ? `${number.format(Number(client.starting_weight_kg))} kg` : "—"} icon={<Scale size={18} />} />
      <StatCard label={t("currentWeight")} value={weight ? `${number.format(Number(weight))} kg` : "—"} note={latest ? t("latestWeek", { date: date.format(new Date(latest.week_of)) }) : t("usingBaseline")} icon={<Scale size={18} />} />
      <StatCard label="BMI" value={bmi === null ? "—" : number.format(bmi)} note={eligible ? t("bmiUpdates") : t("ageHint")} icon={<Activity size={18} />} accent="green" />
    </div>
    <Card className="body-metrics-editor">
      <div className="account-card-heading"><div><span className="eyebrow">{t("baselineEyebrow")}</span><h2>{t("formTitle")}</h2><p>{t("formHint")}</p></div></div>
      <BodyMetricsForm height={String(client.height_cm ?? "")} startingWeight={String(client.starting_weight_kg ?? "")} dateOfBirth={dateOfBirth} goals={String(client.goals || "")} medicalNotes={String(client.medical_notes || "")} />
    </Card>
    <Card className="body-metrics-guide"><h2>{t("bmiTitle")}</h2><p>{t("bmiExplanation")}</p><p>{t("routineHint")}</p><a href="https://www.cdc.gov/bmi/about/index.html" target="_blank" rel="noreferrer">{t("source")}</a></Card>
    {checkIns.length > 0 && <Card className="body-metrics-history"><h2>{t("history")}</h2><p>{t("historyHint")}</p><div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t("week")}</th><th>{t("currentWeight")}</th><th>BMI</th></tr></thead><tbody>{checkIns.map((entry) => {
      const value = eligible ? calculateBmi(client.height_cm, entry.weight_kg) : null;
      return <tr key={entry.id}><td>{date.format(new Date(entry.week_of))}</td><td>{number.format(Number(entry.weight_kg))} kg</td><td>{value === null ? "—" : number.format(value)}</td></tr>;
    })}</tbody></table></div></Card>}
  </>;
}
