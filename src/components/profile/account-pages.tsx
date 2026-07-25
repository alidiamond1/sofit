import {
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Mail,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Avatar, Badge, PageHeader } from "@/components/dashboard/primitives";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { intakeSections } from "@/lib/onboarding/intake-fields";
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

function displayDate(value: unknown) {
  if (!value) return "Not added";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Not added" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function notificationDate(value: unknown) {
  if (!value) return "Just now";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function splitQuestion(label: string) {
  const [question, translation] = label.split(" ? ");
  return { question, translation };
}

export async function AccountProfilePage({ role }: { role: "coach" | "client" }) {
  const session = await requireRole(role);
  const record = await database()("users")
    .select(
      "users.id", "users.name", "users.email", "users.avatar_path", "users.phone", "users.date_of_birth", "users.location", "users.bio", "users.created_at",
      "clients.status", "clients.pipeline_stage", "clients.goals", "clients.medical_notes", "clients.joined_at",
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
  };
  const completionFields = [profile.name, profile.email, profile.phone, profile.dateOfBirth, profile.location, profile.avatarPath];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  return (
    <>
      <PageHeader eyebrow="Account profile" title="Profile" description={role === "client" ? "Your account details and every answer submitted through your private intake form." : "Manage the identity clients see across your SoFit workspace."} />
      <section className={`account-profile-workspace ${role}`}>
        <ProfileWorkspaceTabs
          role={role}
          sidebar={<>
          <section className="profile-context-card">
            <span className="eyebrow">Account snapshot</span>
            <div className="profile-context-list">
              <div><span className="account-heading-icon"><CircleUserRound size={17} /></span><p><small>Role</small><strong>{role === "coach" ? "Coach administrator" : "Client member"}</strong></p></div>
              <div><span className="account-heading-icon"><CalendarDays size={17} /></span><p><small>Member since</small><strong>{displayDate(record.joined_at || record.created_at)}</strong></p></div>
              <div><span className="account-heading-icon"><MapPin size={17} /></span><p><small>Location</small><strong>{profile.location || "Not added"}</strong></p></div>
            </div>
          </section>
          {role === "client" ? (
            <section className="profile-program-card">
              <span className="eyebrow">Current coaching</span>
              <h3>{record.package_name || record.service_name || "Program not assigned"}</h3>
              <p>{record.package_name && record.service_name ? record.service_name : "Your coach will add the right service here."}</p>
              <div><Badge tone={record.status === "active" ? "success" : "warning"}>{record.status || "onboarding"}</Badge><span>{record.pipeline_stage || "onboarding"}</span></div>
            </section>
          ) : null}
          </>}
          overview={
          <section className="profile-identity-banner" id="profile-overview">
            <div className="profile-cover" aria-hidden="true" />
            <div className="profile-identity-row">
              <Avatar name={profile.name} src={profile.avatarPath} className="profile-avatar-hero" />
              <div className="profile-identity-copy"><span className="eyebrow">{role === "coach" ? "Head coach" : "SoFit client"}</span><h2>{profile.name}</h2><p><Mail size={14} /> {profile.email}</p></div>
              <div className="profile-completion">
                <div><span>Profile completeness</span><strong>{completion}%</strong></div>
                <div className="profile-completion-track"><i style={{ width: `${completion}%` }} /></div>
                <small>{completion === 100 ? "Your profile is complete." : "Add your photo and missing contact details."}</small>
              </div>
            </div>
          </section>
          }
          information={<ProfileEditor role={role} profile={profile} />}
          intake={role === "client" ? (
            <section className="profile-intake-panel" aria-labelledby="intake-profile-title">
              <div className="section-row intake-profile-heading"><div><span className="eyebrow">Original application</span><h2 id="intake-profile-title">Your intake answers</h2><p>Every answer from your private application, kept with your profile for easy reference.</p></div><Badge tone="success">Intake complete</Badge></div>
              <div className="intake-profile-groups">
                {intakeSections.map((section, index) => (
                  <details className="account-card intake-profile-group" key={section.id} open={index === 0}>
                    <summary><span className="intake-section-number">0{index + 1}</span><div><strong>{section.title}</strong><small>{section.subtitle}</small></div><ChevronRight size={18} /></summary>
                    <dl>
                      {section.fields.map((field) => {
                        const label = splitQuestion(field.label);
                        return <div key={field.name}><dt>{label.question}{label.translation ? <small>{label.translation}</small> : null}</dt><dd>{answers[field.name] || "Not answered"}</dd></div>;
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
    createdLabel: notificationDate(item.created_at),
    isRead: Boolean(item.read_at),
    personName: item.person_name ? String(item.person_name) : null,
  }));

  return (
    <>
      <PageHeader eyebrow="Account control" title="Settings" description="Manage preferences, notifications, and account security from one clear place." actions={<Link className="button secondary" href={`/${role}/profile`}><CircleUserRound size={16} /> Open profile</Link>} />
      <section className="account-settings-workspace">
        <header className="settings-workspace-head">
          <div className="settings-identity-card"><Avatar name={user.name} src={user.avatar_path} /><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
          <div className="settings-account-state"><span>Private account</span><Badge tone={user.is_active ? "success" : "danger"}>{user.is_active ? "Active" : "Disabled"}</Badge></div>
        </header>
        <SettingsWorkspace role={role} settings={settings} createdAt={displayDate(user.created_at)} recipients={recipients.map((client) => ({ id: Number(client.id), name: String(client.name), email: String(client.email) }))} notifications={notifications} />
      </section>
    </>
  );
}
