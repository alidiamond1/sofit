import {
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Mail,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar, Badge, PageHeader } from "@/components/dashboard/primitives";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { intakeSections } from "@/lib/onboarding/intake-fields";
import { statusLabel } from "@/lib/status-labels";
import { ProfileEditor } from "./profile-editor";
import { ProfileWorkspaceTabs } from "./profile-workspace-tabs";
import { SettingsWorkspace } from "./settings-workspace";

function parseAnswers(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === "string") {
    try { return JSON.parse(value) as Record<string, string>; } catch { return {}; }
  }
  return value as Record<string, string>;
}

function dateInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function displayDate(value: unknown, fallback: string) {
  if (!value) return fallback;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function notificationDate(value: unknown, fallback: string) {
  if (!value) return fallback;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function splitQuestion(label: string) {
  const [question, translation] = label.split(" ? ");
  return { question, translation };
}

export async function AccountProfilePage({ role }: { role: "coach" | "client" }) {
  const t = await getTranslations("Account");
  const ts = await getTranslations("Common.status");
  const session = await requireRole(role);
  const record = await database()("users")
    .select(
      "users.id", "users.name", "users.email", "users.avatar_path", "users.phone", "users.date_of_birth", "users.location", "users.bio", "users.created_at",
      "clients.status", "clients.pipeline_stage", "clients.goals", "clients.medical_notes", "clients.joined_at", "clients.height_cm", "clients.starting_weight_kg",
      "services.name as service_name", "packages.name as package_name", "packages.category as package_category", "invites.intake_answers",
    )
    .leftJoin("clients", "clients.user_id", "users.id")
    .leftJoin("services", "services.id", "clients.service_id")
    .leftJoin("packages", "packages.id", "clients.package_id")
    .leftJoin("invites", "invites.user_id", "users.id")
    .where("users.id", session.id)
    .orderBy("invites.created_at", "desc")
    .first();

  const answers = parseAnswers(record?.intake_answers);
  const profile = {
    name: String(record.name),
    email: String(record.email),
    phone: String(record.phone || ""),
    dateOfBirth: dateInput(record.date_of_birth),
    location: String(record.location || ""),
    bio: String(record.bio || ""),
    goals: String(record.goals || answers.goals || ""),
    medicalNotes: String(record.medical_notes || ""),
    avatarPath: record.avatar_path ? String(record.avatar_path) : null,
    heightCm: record.height_cm != null ? String(record.height_cm) : "",
    weightKg: record.starting_weight_kg != null ? String(record.starting_weight_kg) : "",
  };
  const completionFields = role === "client"
    ? [profile.name, profile.email, profile.phone, profile.dateOfBirth, profile.location, profile.avatarPath, profile.heightCm, profile.weightKg]
    : [profile.name, profile.email, profile.phone, profile.dateOfBirth, profile.location, profile.avatarPath];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  return (
    <>
      <PageHeader eyebrow={t("profileEyebrow")} title={t("profileTitle")} description={role === "client" ? t("profileDescriptionClient") : t("profileDescriptionCoach")} />
      <section className={`account-profile-workspace ${role}`}>
        <ProfileWorkspaceTabs
          role={role}
          sidebar={<>
          <section className="profile-context-card">
            <span className="eyebrow">{t("accountSnapshot")}</span>
            <div className="profile-context-list">
              <div><span className="account-heading-icon"><CircleUserRound size={17} /></span><p><small>{t("role")}</small><strong>{role === "coach" ? t("roleCoach") : t("roleClient")}</strong></p></div>
              <div><span className="account-heading-icon"><CalendarDays size={17} /></span><p><small>{t("memberSince")}</small><strong>{displayDate(record.joined_at || record.created_at, t("notAdded"))}</strong></p></div>
              <div><span className="account-heading-icon"><MapPin size={17} /></span><p><small>{t("location")}</small><strong>{profile.location || t("notAdded")}</strong></p></div>
            </div>
          </section>
          {role === "client" ? (
            <section className="profile-program-card">
              <span className="eyebrow">{t("currentCoaching")}</span>
              <h3>{record.package_name || record.service_name || t("programNotAssigned")}</h3>
              <p>{record.package_name && record.service_name ? record.service_name : t("coachWillAddService")}</p>
              <div><Badge tone={record.status === "active" ? "success" : "warning"}>{statusLabel(ts, record.status || "onboarding")}</Badge><span>{statusLabel(ts, record.pipeline_stage || "onboarding")}</span></div>
            </section>
          ) : null}
          </>}
          overview={
          <section className="profile-identity-banner" id="profile-overview">
            <div className="profile-cover" aria-hidden="true" />
            <div className="profile-identity-row">
              <Avatar name={profile.name} src={profile.avatarPath} className="profile-avatar-hero" />
              <div className="profile-identity-copy"><span className="eyebrow">{role === "coach" ? t("headCoach") : t("sofitClient")}</span><h2>{profile.name}</h2><p><Mail size={14} /> {profile.email}</p></div>
              <div className="profile-completion">
                <div><span>{t("profileCompleteness")}</span><strong>{completion}%</strong></div>
                <div className="profile-completion-track"><i style={{ width: `${completion}%` }} /></div>
                <small>{completion === 100 ? t("profileComplete") : t("profileIncomplete")}</small>
              </div>
            </div>
          </section>
          }
          information={<ProfileEditor role={role} profile={profile} />}
          intake={role === "client" ? (
            <section className="profile-intake-panel" aria-labelledby="intake-profile-title">
              <div className="section-row intake-profile-heading"><div><span className="eyebrow">{t("originalApplication")}</span><h2 id="intake-profile-title">{t("yourIntakeAnswers")}</h2><p>{t("intakeAnswersHint")}</p></div><Badge tone="success">{t("intakeComplete")}</Badge></div>
              <div className="intake-profile-groups">
                {intakeSections.map((section, index) => (
                  <details className="account-card intake-profile-group" key={section.id} open={index === 0}>
                    <summary><span className="intake-section-number">0{index + 1}</span><div><strong>{section.title}</strong><small>{section.subtitle}</small></div><ChevronRight size={18} /></summary>
                    <dl>
                      {section.fields.map((field) => {
                        const label = splitQuestion(field.label);
                        return <div key={field.name}><dt>{label.question}{label.translation ? <small>{label.translation}</small> : null}</dt><dd>{answers[field.name] || t("notAnswered")}</dd></div>;
                      })}
                    </dl>
                  </details>
                ))}
              </div>
            </section>
          ) : undefined}
        />
      </section>
    </>
  );
}

export async function AccountSettingsPage({ role }: { role: "coach" | "client" }) {
  const t = await getTranslations("Account");
  const tc = await getTranslations("Common");
  const session = await requireRole(role);
  const notificationQuery = database()("notifications")
    .select("notifications.id", "notifications.title", "notifications.message", "notifications.read_at", "notifications.created_at", "person.name as person_name")
    .leftJoin("users as person", "person.id", role === "coach" ? "notifications.user_id" : "notifications.sender_id")
    .where(role === "coach" ? { "notifications.sender_id": session.id } : { "notifications.user_id": session.id })
    .orderBy("notifications.created_at", "desc")
    .limit(8);
  const [user, saved, recipients, notificationRows] = await Promise.all([
    database()("users").select("name", "email", "avatar_path", "created_at", "is_active").where({ id: session.id }).first(),
    database()("user_settings").where({ user_id: session.id }).first(),
    role === "coach"
      ? database()("users").select("users.id", "users.name", "users.email").innerJoin("clients", "clients.user_id", "users.id").where({ "users.role": "client", "users.is_active": true, "users.approval_status": "approved" }).orderBy("users.name")
      : Promise.resolve([]),
    notificationQuery,
  ]);
  const settings = {
    timezone: String(saved?.timezone || "Africa/Nairobi"),
    language: String(saved?.language || "en"),
    theme: (saved?.theme === "light" || saved?.theme === "dark" ? saved.theme : "system") as "light" | "dark" | "system",
    emailNotifications: saved ? Boolean(saved.email_notifications) : true,
    inAppNotifications: saved ? Boolean(saved.in_app_notifications) : true,
    weeklySummary: saved ? Boolean(saved.weekly_summary) : true,
    sessionReminders: saved ? Boolean(saved.session_reminders) : true,
  };
  const notifications = notificationRows.map((item) => ({
    id: Number(item.id),
    title: String(item.title),
    message: String(item.message),
    createdLabel: notificationDate(item.created_at, tc("notRecorded")),
    isRead: Boolean(item.read_at),
    personName: item.person_name ? String(item.person_name) : null,
  }));

  return (
    <>
      <PageHeader eyebrow={t("settingsEyebrow")} title={t("settingsTitle")} description={t("settingsDescription")} actions={<Link className="button secondary" href={`/${role}/profile`}><CircleUserRound size={16} /> {t("openProfile")}</Link>} />
      <section className="account-settings-workspace">
        <header className="settings-workspace-head">
          <div className="settings-identity-card"><Avatar name={user.name} src={user.avatar_path} /><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
          <div className="settings-account-state"><span>{t("privateAccount")}</span><Badge tone={user.is_active ? "success" : "danger"}>{user.is_active ? t("active") : t("disabled")}</Badge></div>
        </header>
        <SettingsWorkspace role={role} settings={settings} createdAt={displayDate(user.created_at, tc("notRecorded"))} recipients={recipients.map((client) => ({ id: Number(client.id), name: String(client.name), email: String(client.email) }))} notifications={notifications} />
      </section>
    </>
  );
}
