import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Mail,
  Scale,
  Send,
  Utensils,
} from "lucide-react";
import { redirect } from "next/navigation";
import { sendClientMessageAction, submitClientCheckInAction } from "@/app/actions/client";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { HorizontalBars, TrendLineChart } from "./charts";
import { Avatar, Badge, Card, CardHead, PageHeader, StatCard } from "./primitives";
import { ExerciseMotion } from "@/components/plans/exercise-motion";

export const realClientSections = ["plans", "sessions", "check-in", "progress", "messages", "payments", "profile"];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function numeric(value: unknown) {
  return Number(value || 0);
}

function jsonArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

function tone(status: string): "success" | "warning" | "danger" | "neutral" | "blue" {
  if (["active", "approved", "paid", "attended", "reviewed", "completed"].includes(status)) return "success";
  if (["overdue", "rejected", "cancelled", "no_show", "churned"].includes(status)) return "danger";
  if (["pending", "submitted", "paused", "unpaid", "draft", "scheduled"].includes(status)) return "warning";
  return "neutral";
}

function EmptyState({ text }: { text: string }) {
  return <Card className="empty-state"><ClipboardList size={24} /><h3>Nothing here yet</h3><p>{text}</p></Card>;
}

async function getClientContext() {
  const session = await requireRole("client");
  const client = await database()("clients")
    .select(
      "clients.*",
      "users.name",
      "users.email",
      "users.created_at as account_created_at",
      "services.name as service_name",
      "services.type as service_type",
      "services.tier as service_tier",
      "services.price as service_price",
      "services.billing_interval as service_billing_interval",
      "packages.id as package_id",
      "packages.name as package_name",
      "packages.category as package_category",
      "packages.description as package_description",
      "packages.price as package_price",
      "packages.billing_interval as package_billing_interval",
      "invites.intake_answers",
    )
    .join("users", "users.id", "clients.user_id")
    .leftJoin("services", "services.id", "clients.service_id")
    .leftJoin("packages", "packages.id", "clients.package_id")
    .leftJoin("invites", "invites.user_id", "users.id")
    .where("users.id", session.id)
    .first();
  if (!client) redirect("/");
  return { session, client };
}

async function ClientHome() {
  const { client } = await getClientContext();
  const now = new Date();
  const [dietPlan, workoutPlan, nextSession, recentCheckIns, openInvoice, packageServices] = await Promise.all([
    database()("diet_plans").where({ client_id: client.id, status: "active" }).orderBy("updated_at", "desc").first(),
    database()("workout_plans").where({ client_id: client.id, status: "active" }).orderBy("updated_at", "desc").first(),
    database()("sessions").where({ client_id: client.id, attendance: "scheduled" }).where("starts_at", ">=", now).orderBy("starts_at").first(),
    database()("check_ins").where({ client_id: client.id }).orderBy("week_of", "desc").limit(8),
    database()("invoices").where({ client_id: client.id }).whereIn("status", ["unpaid", "overdue"]).orderBy("due_on").first(),
    client.package_id
      ? database()("package_services")
          .select("package_services.quantity", "services.name", "services.type", "services.tier")
          .join("services", "services.id", "package_services.service_id")
          .where("package_services.package_id", client.package_id)
          .orderBy("services.type")
      : Promise.resolve([]),
  ]);
  const latestCheckIn = recentCheckIns[0];
  const progressTrend = [...recentCheckIns]
    .reverse()
    .filter((item) => item.weight_kg != null)
    .map((item) => ({
      label: new Date(item.week_of).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: numeric(item.weight_kg),
    }));

  return (
    <>
      <PageHeader
        eyebrow={client.package_name || client.service_name || "SoFit client"}
        title={`Welcome, ${client.name}.`}
        description="Stay focused on today's plan, your next coaching touchpoint, and the progress you are building."
      />
      {client.package_name ? (
        <Card className="client-package-summary">
          <div>
            <span className="eyebrow">Your package</span>
            <h2>{client.package_name}</h2>
            <p>{client.package_description || "Your coach has assigned this package to your account."}</p>
          </div>
          <div className="client-package-services">
            {packageServices.map((service) => <span key={service.name}>{service.quantity}x {service.name}</span>)}
          </div>
          <div className="client-package-price">
            <Badge tone="success">{client.package_category}</Badge>
            <strong>{money.format(numeric(client.package_price))}</strong>
            <span>{client.package_billing_interval}</span>
          </div>
        </Card>
      ) : null}
      <div className="stats-grid">
        <StatCard label="Account status" value={client.status} note={client.pipeline_stage} icon={<CheckCircle2 size={18} />} accent="green" />
        <StatCard label="Latest weight" value={latestCheckIn?.weight_kg ? `${latestCheckIn.weight_kg} kg` : "-"} note={latestCheckIn ? dateOnly.format(new Date(latestCheckIn.week_of)) : "No check-in yet"} icon={<Scale size={18} />} points={progressTrend.map((point) => point.value)} />
        <StatCard label="Diet adherence" value={latestCheckIn?.diet_adherence_pct != null ? `${latestCheckIn.diet_adherence_pct}%` : "-"} note="Latest submitted week" icon={<Utensils size={18} />} accent="green" />
        <StatCard label="Workout completion" value={latestCheckIn?.workout_completion_pct != null ? `${latestCheckIn.workout_completion_pct}%` : "-"} note="Latest submitted week" icon={<Activity size={18} />} />
      </div>
      <div className="dashboard-insight-grid client-dashboard-insights">
        <Card className="chart-card">
          <CardHead title="Your momentum" meta="Weight trend from recent check-ins" />
          <TrendLineChart data={progressTrend} valueLabel="Weight" formatValue={(value) => `${value} kg`} />
        </Card>
        <Card className="chart-card">
          <CardHead title="Weekly consistency" meta={latestCheckIn ? dateOnly.format(new Date(latestCheckIn.week_of)) : "Awaiting first check-in"} action={<BarChart3 size={18} />} />
          <HorizontalBars
            valueLabel="%"
            items={[
              { label: "Diet adherence", value: numeric(latestCheckIn?.diet_adherence_pct), detail: `${numeric(latestCheckIn?.diet_adherence_pct)}%` },
              { label: "Workout completion", value: numeric(latestCheckIn?.workout_completion_pct), detail: `${numeric(latestCheckIn?.workout_completion_pct)}%` },
              { label: "Energy", value: numeric(latestCheckIn?.energy_score) * 10, detail: `${numeric(latestCheckIn?.energy_score)}/10` },
              { label: "Sleep", value: numeric(latestCheckIn?.sleep_score) * 10, detail: `${numeric(latestCheckIn?.sleep_score)}/10` },
            ]}
          />
        </Card>
      </div>
      <div className="overview-grid">
        <Card>
          <CardHead title="Current plans" meta="Assigned by your coach" />
          <div className="simple-rows">
            {dietPlan ? <div><span className="task-icon mint"><Utensils size={16} /></span><div><strong>{dietPlan.title}</strong><span>{dietPlan.daily_calories ? `${dietPlan.daily_calories} kcal` : "Diet plan"} - version {dietPlan.version}</span></div><Badge tone="success">{dietPlan.status}</Badge></div> : null}
            {workoutPlan ? <div><span className="task-icon mint"><Dumbbell size={16} /></span><div><strong>{workoutPlan.title}</strong><span>{workoutPlan.weeks} weeks - version {workoutPlan.version}</span></div><Badge tone="success">{workoutPlan.status}</Badge></div> : null}
            {!dietPlan && !workoutPlan ? <div><span>Your coach has not assigned a plan yet.</span></div> : null}
          </div>
        </Card>
        <Card>
          <CardHead title="Next actions" meta="Live account records" />
          <div className="simple-rows">
            <div><span className="task-icon mint"><CalendarDays size={16} /></span><div><strong>Next session</strong><span>{nextSession ? dateTime.format(new Date(nextSession.starts_at)) : "No session booked"}</span></div></div>
            <div><span className="task-icon sand"><CheckCircle2 size={16} /></span><div><strong>Weekly check-in</strong><span>{latestCheckIn ? `Last submitted ${dateOnly.format(new Date(latestCheckIn.week_of))}` : "Not submitted yet"}</span></div></div>
            <div><span className="task-icon rose"><Mail size={16} /></span><div><strong>Payment</strong><span>{openInvoice ? `${openInvoice.number} - ${money.format(numeric(openInvoice.amount))}` : "No unpaid invoice"}</span></div></div>
          </div>
        </Card>
      </div>
    </>
  );
}

async function ClientPlans() {
  const { client } = await getClientContext();
  const [dietPlans, workoutPlans] = await Promise.all([
    database()("diet_plans").where({ client_id: client.id }).orderBy("updated_at", "desc"),
    database()("workout_plans").where({ client_id: client.id }).orderBy("updated_at", "desc"),
  ]);
  return (
    <>
      <PageHeader title="My plans" description="Plans assigned to your account in MySQL." />
      <div className="client-plan-stack">
        {dietPlans.map((plan) => {
          const meals = jsonArray(plan.meals);
          return <Card className="client-detailed-plan" key={plan.id}><div className="client-plan-title"><div><Badge tone={tone(plan.status)}>{plan.status}</Badge><span>Diet plan - version {plan.version}</span><h2>{plan.title}</h2></div><div className="plan-metrics"><div><strong>{plan.daily_calories || "-"}</strong><span>kcal</span></div><div><strong>{plan.protein_g || "-"}</strong><span>protein g</span></div><div><strong>{plan.carbs_g || "-"}</strong><span>carbs g</span></div></div></div><div className="client-meal-timeline">{meals.map((meal, index) => { const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : Array.isArray(meal.items) ? meal.items : []; return <article key={`${String(meal.name)}-${index}`}><time>{String(meal.time || "--:--")}</time><span className="meal-type">{String(meal.type || "meal")}</span><div><h3>{String(meal.name || "Meal")}</h3><p>{ingredients.map(String).join(" - ") || "No ingredients listed"}</p></div><strong>{meal.calories ? `${meal.calories} kcal` : ""}</strong></article>; })}{meals.length === 0 ? <p>No meals are listed in this plan.</p> : null}</div></Card>;
        })}
        {workoutPlans.map((plan) => {
          const exercises = jsonArray(plan.exercises);
          const days = jsonArray(plan.weekly_split);
          return <Card className="client-detailed-plan training" key={plan.id}><div className="client-plan-title"><div><Badge tone={tone(plan.status)}>{plan.status}</Badge><span>Workout program - version {plan.version}</span><h2>{plan.title}</h2></div><div className="plan-metrics"><div><strong>{plan.weeks}</strong><span>weeks</span></div><div><strong>{days.length || new Set(exercises.map((item) => String(item.day))).size}</strong><span>days</span></div><div><strong>{exercises.length}</strong><span>exercises</span></div></div></div><div className="client-exercise-list">{exercises.map((exercise, index) => <article key={`${String(exercise.exercise)}-${index}`}><ExerciseMotion compact type={String(exercise.motion_type || "custom")} mediaUrl={exercise.media_url ? String(exercise.media_url) : null} label={String(exercise.exercise || "Exercise")} /><div><span>{String(exercise.day || "Training day")} - {String(exercise.muscle_group || "Exercise")}</span><h3>{String(exercise.exercise || "Exercise")}</h3><p>{String(exercise.instructions || exercise.equipment || "Follow the coach's prescribed technique.")}</p></div><div className="exercise-prescription"><strong>{String(exercise.sets || "-")} x {String(exercise.reps || "-")}</strong><span>RPE {String(exercise.rpe || "-")} - {String(exercise.rest_seconds || 0)}s rest</span></div></article>)}{exercises.length === 0 ? <p>No exercises are listed in this program.</p> : null}</div></Card>;
        })}
      </div>
      {dietPlans.length === 0 && workoutPlans.length === 0 ? <EmptyState text="Your coach has not assigned a diet or workout plan yet." /> : null}
    </>
  );
}

async function ClientSessions() {
  const { client } = await getClientContext();
  const sessions = await database()("sessions")
    .select("sessions.*", "services.name as service")
    .leftJoin("services", "services.id", "sessions.service_id")
    .where("sessions.client_id", client.id)
    .orderBy("starts_at", "desc");
  return <><PageHeader title="My sessions" description="Your real booking and attendance history." />{sessions.length === 0 ? <EmptyState text="No personal training sessions are booked yet." /> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Session</th><th>Date</th><th>Duration</th><th>Attendance</th><th>Notes</th></tr></thead><tbody>{sessions.map((item) => <tr key={item.id}><td>{item.service || "Personal training"}</td><td>{dateTime.format(new Date(item.starts_at))}</td><td>{item.duration_minutes} min</td><td><Badge tone={tone(item.attendance)}>{item.attendance}</Badge></td><td>{item.notes || "-"}</td></tr>)}</tbody></table></div></Card>}</>;
}

async function ClientCheckIn() {
  const { client } = await getClientContext();
  const latest = await database()("check_ins").where({ client_id: client.id }).orderBy("week_of", "desc").first();
  return (
    <>
      <PageHeader title="Weekly check-in" description="Submitting this form writes directly to your MySQL check-in record." />
      <div className="checkin-form-layout">
        <Card className="checkin-form">
          <form action={submitClientCheckInAction}>
            <div className="form-grid">
              <label><span>Current weight (kg)</span><input name="weight_kg" type="number" min="1" max="500" step="0.1" required /></label>
              <label><span>Diet adherence (%)</span><input name="diet_adherence_pct" type="number" min="0" max="100" required /></label>
              <label><span>Workout completion (%)</span><input name="workout_completion_pct" type="number" min="0" max="100" required /></label>
              <label><span>Energy (1-10)</span><input name="energy_score" type="number" min="1" max="10" required /></label>
              <label><span>Sleep quality (1-10)</span><input name="sleep_score" type="number" min="1" max="10" required /></label>
              <label className="full"><span>Wins, challenges, and coach notes</span><textarea name="client_notes" rows={5} required /></label>
            </div>
            <div className="form-submit"><span>Your coach can review this after submission.</span><button className="button primary" type="submit">Submit check-in</button></div>
          </form>
        </Card>
        <Card><CardHead title="Latest check-in" meta={latest ? dateOnly.format(new Date(latest.week_of)) : "No submission"} />{latest ? <div className="simple-rows"><div><strong>Weight</strong><Badge>{latest.weight_kg} kg</Badge></div><div><strong>Diet adherence</strong><Badge tone="success">{latest.diet_adherence_pct}%</Badge></div><div><strong>Workout completion</strong><Badge tone="blue">{latest.workout_completion_pct}%</Badge></div><div><strong>Status</strong><Badge tone={tone(latest.status)}>{latest.status}</Badge></div></div> : <p>No check-in has been stored yet.</p>}</Card>
      </div>
    </>
  );
}

async function ClientProgress() {
  const { client } = await getClientContext();
  const checkIns = await database()("check_ins").where({ client_id: client.id }).orderBy("week_of", "desc");
  const latest = checkIns[0];
  const chronological = [...checkIns].reverse();
  const weightTrend = chronological
    .filter((item) => item.weight_kg != null)
    .map((item) => ({ label: new Date(item.week_of).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: numeric(item.weight_kg) }));
  const adherenceTrend = chronological.map((item) => ({
    label: new Date(item.week_of).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.round((numeric(item.diet_adherence_pct) + numeric(item.workout_completion_pct)) / 2),
  }));
  return (
    <>
      <PageHeader eyebrow="Your journey" title="Progress" description="See the habits behind your results, calculated only from submitted weekly check-ins." />
      <div className="stats-grid compact">
        <StatCard label="Current weight" value={latest?.weight_kg ? `${latest.weight_kg} kg` : "-"} icon={<Scale size={18} />} points={weightTrend.map((point) => point.value)} />
        <StatCard label="Diet adherence" value={latest?.diet_adherence_pct != null ? `${latest.diet_adherence_pct}%` : "-"} icon={<Utensils size={18} />} accent="green" />
        <StatCard label="Workout completion" value={latest?.workout_completion_pct != null ? `${latest.workout_completion_pct}%` : "-"} icon={<Activity size={18} />} />
        <StatCard label="Check-ins" value={String(checkIns.length)} icon={<CheckCircle2 size={18} />} accent="green" />
      </div>
      {checkIns.length === 0 ? (
        <EmptyState text="Submit your first weekly check-in to begin tracking progress." />
      ) : (
        <>
          <div className="progress-chart-grid">
            <Card className="chart-card"><CardHead title="Weight trend" meta="Change across submitted check-ins" /><TrendLineChart data={weightTrend} valueLabel="Weight" formatValue={(value) => `${value} kg`} /></Card>
            <Card className="chart-card"><CardHead title="Adherence trend" meta="Average of nutrition and training" /><TrendLineChart data={adherenceTrend} valueLabel="Adherence" formatValue={(value) => `${value}%`} /></Card>
          </div>
          <Card>
            <CardHead title="Check-in history" meta={`${checkIns.length} submitted records`} />
            <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Week</th><th>Weight</th><th>Diet</th><th>Workout</th><th>Energy</th><th>Sleep</th><th>Status</th></tr></thead><tbody>{checkIns.map((item) => <tr key={item.id}><td>{dateOnly.format(new Date(item.week_of))}</td><td>{item.weight_kg || "-"} kg</td><td>{item.diet_adherence_pct ?? "-"}%</td><td>{item.workout_completion_pct ?? "-"}%</td><td>{item.energy_score ?? "-"}/10</td><td>{item.sleep_score ?? "-"}/10</td><td><Badge tone={tone(item.status)}>{item.status}</Badge></td></tr>)}</tbody></table></div>
          </Card>
        </>
      )}
    </>
  );
}

async function ClientMessages() {
  const { session } = await getClientContext();
  const [coach, messages] = await Promise.all([
    database()("users").select("id", "name", "email").where({ role: "coach", is_active: true }).orderBy("id").first(),
    database()("messages")
      .select("messages.*", "sender.name as sender")
      .join("users as sender", "sender.id", "messages.sender_id")
      .where((query) => query.where("messages.sender_id", session.id).orWhere("messages.recipient_id", session.id))
      .orderBy("messages.created_at", "asc"),
  ]);
  return <><PageHeader title="Messages" description="Messages are read from and written to MySQL." /><Card className="message-shell client-chat"><section className="chat-panel"><header><div>{coach ? <><Avatar name={coach.name} /><p><strong>{coach.name}</strong><span>{coach.email}</span></p></> : <p><strong>No coach account found</strong></p>}</div></header><div className="chat-history">{messages.map((message) => <div className={numeric(message.sender_id) === session.id ? "bubble outgoing" : "bubble incoming"} key={message.id}>{message.body}<time>{dateTime.format(new Date(message.created_at))}</time></div>)}{messages.length === 0 ? <p>No messages yet.</p> : null}</div><form className="message-compose" action={sendClientMessageAction}><input name="body" placeholder="Message your coach" required disabled={!coach} /><button type="submit" className="send-button" disabled={!coach} aria-label="Send message"><Send size={17} /></button></form></section></Card></>;
}

async function ClientPayments() {
  const { client } = await getClientContext();
  const invoices = await database()("invoices").select("invoices.*", "services.name as service").leftJoin("services", "services.id", "invoices.service_id").where("invoices.client_id", client.id).orderBy("due_on", "desc");
  return <><PageHeader title="Payments" description="Your invoice records stored in MySQL. No Stripe data is used." />{invoices.length === 0 ? <EmptyState text="No invoices have been created for your account." /> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Invoice</th><th>Service</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td>{invoice.number}</td><td>{invoice.service || "-"}</td><td>{money.format(numeric(invoice.amount))}</td><td>{dateOnly.format(new Date(invoice.due_on))}</td><td><Badge tone={tone(invoice.status)}>{invoice.status}</Badge></td></tr>)}</tbody></table></div></Card>}</>;
}

async function ClientProfile() {
  const { client } = await getClientContext();
  const answers = typeof client.intake_answers === "string" ? JSON.parse(client.intake_answers) : client.intake_answers || {};
  return <><PageHeader title="Profile" description="Account and intake details stored in MySQL." /><div className="profile-layout"><Card className="profile-summary"><Avatar name={client.name} /><h2>{client.name}</h2><p>{client.email}</p><Badge tone={tone(client.status)}>{client.status}</Badge></Card><Card><CardHead title="Client details" meta="Your onboarding record" /><div className="application-answers"><dl><div><dt>Assigned package</dt><dd>{client.package_name ? `${client.package_name} (${client.package_category})` : "Not assigned"}</dd></div><div><dt>Primary service</dt><dd>{client.service_name || "Not assigned"}</dd></div><div><dt>Pipeline stage</dt><dd>{client.pipeline_stage}</dd></div><div><dt>Goals</dt><dd>{client.goals || answers.goals || "-"}</dd></div><div><dt>Phone</dt><dd>{client.phone || "-"}</dd></div><div><dt>Coach expectations</dt><dd>{answers.coach_expectations || "-"}</dd></div><div><dt>Meal-plan motivation</dt><dd>{answers.meal_plan_motivation || "-"}</dd></div></dl></div></Card></div></>;
}

export async function RealClientSection({ section = "home" }: { section?: string }) {
  if (section === "home") return <ClientHome />;
  if (section === "plans") return <ClientPlans />;
  if (section === "sessions") return <ClientSessions />;
  if (section === "check-in") return <ClientCheckIn />;
  if (section === "progress") return <ClientProgress />;
  if (section === "messages") return <ClientMessages />;
  if (section === "payments") return <ClientPayments />;
  return <ClientProfile />;
}
