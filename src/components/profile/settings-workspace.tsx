"use client";

import {
  BellRing,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  MonitorCog,
  Moon,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { markNotificationReadAction, sendNotificationAction } from "@/app/actions/notifications";
import { changePasswordAction, updateNotificationsAction, updatePreferencesAction } from "@/app/actions/profile";
import { applyThemePreference, type ThemePreference } from "@/components/dashboard/theme-sync";

type SettingsStep = "preferences" | "notifications" | "security";

type SettingsWorkspaceProps = {
  role: "coach" | "client";
  createdAt: string;
  settings: {
    timezone: string;
    language: string;
    theme: ThemePreference;
    emailNotifications: boolean;
    inAppNotifications: boolean;
    weeklySummary: boolean;
    sessionReminders: boolean;
  };
  recipients: Array<{ id: number; name: string; email: string }>;
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    createdLabel: string;
    isRead: boolean;
    personName: string | null;
  }>;
};

const steps = [
  { id: "preferences" as const, number: "01", label: "Preferences", description: "Theme, language & region", icon: SlidersHorizontal },
  { id: "notifications" as const, number: "02", label: "Notifications", description: "Alerts and coach updates", icon: BellRing },
  { id: "security" as const, number: "03", label: "Security", description: "Password & login", icon: ShieldCheck },
];

export function SettingsWorkspace({ role, settings, createdAt, recipients, notifications }: SettingsWorkspaceProps) {
  const [activeStep, setActiveStep] = useState<SettingsStep>("preferences");
  const [themeChoice, setThemeChoice] = useState<ThemePreference>(settings.theme);
  const initialTheme = useRef(settings.theme);
  const passwordForm = useRef<HTMLFormElement>(null);
  const preferencesAction = updatePreferencesAction.bind(null, role);
  const notificationsAction = updateNotificationsAction.bind(null, role);
  const passwordAction = changePasswordAction.bind(null, role);
  const [preferencesState, preferencesFormAction, preferencesPending] = useActionState(preferencesAction, {});
  const [notificationsState, notificationsFormAction, notificationsPending] = useActionState(notificationsAction, {});
  const [passwordState, passwordFormAction, passwordPending] = useActionState(passwordAction, {});
  const [sendState, sendFormAction, sendPending] = useActionState(sendNotificationAction, {});

  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === "#security") setActiveStep("security");
      if (window.location.hash === "#notifications") setActiveStep("notifications");
    };
    const frame = window.requestAnimationFrame(syncHash);
    window.addEventListener("hashchange", syncHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    if (passwordState.success) passwordForm.current?.reset();
  }, [passwordState.success]);

  useEffect(() => () => applyThemePreference(initialTheme.current), []);

  function selectStep(step: SettingsStep) {
    setActiveStep(step);
    window.history.replaceState(null, "", step === "preferences" ? window.location.pathname : `#${step}`);
  }

  function previewTheme(theme: ThemePreference) {
    setThemeChoice(theme);
    applyThemePreference(theme);
  }

  return (
    <div className="settings-workspace-body">
      <nav className="settings-step-nav" aria-label="Settings steps">
        {steps.map((step) => {
          const Icon = step.icon;
          const active = activeStep === step.id;
          return (
            <button key={step.id} type="button" className={active ? "is-active" : ""} aria-current={active ? "step" : undefined} onClick={() => selectStep(step.id)}>
              <span className="settings-step-number">{step.number}</span>
              <span className="settings-step-icon"><Icon size={18} /></span>
              <span><strong>{step.label}</strong><small>{step.description}</small></span>
            </button>
          );
        })}
      </nav>

      <main className="settings-step-content">
        {activeStep === "preferences" ? (
          <section className="settings-step-panel" id="preferences">
            <SettingsHeading eyebrow="Step 1 of 3" title="Workspace preferences" description="Choose your appearance, language, timezone, and regional formatting." icon={<SlidersHorizontal size={19} />} />
            <form action={preferencesFormAction} className="account-form-grid settings-panel-form">
              <fieldset className="theme-fieldset full">
                <legend>Appearance</legend>
                <p>Use a calm light workspace, a focused dark workspace, or follow your device.</p>
                <div className="theme-choice-grid">
                  <ThemeChoice value="light" title="Light" description="Bright and clean" icon={<Sun size={18} />} checked={themeChoice === "light"} onChange={previewTheme} />
                  <ThemeChoice value="dark" title="Dark" description="Low-light comfort" icon={<Moon size={18} />} checked={themeChoice === "dark"} onChange={previewTheme} />
                  <ThemeChoice value="system" title="System" description="Match your device" icon={<MonitorCog size={18} />} checked={themeChoice === "system"} onChange={previewTheme} />
                </div>
              </fieldset>
              <label><span>Timezone</span><select name="timezone" defaultValue={settings.timezone}><option value="Africa/Nairobi">Africa / Nairobi</option><option value="UTC">UTC</option><option value="Europe/London">Europe / London</option><option value="America/New_York">America / New York</option></select></label>
              <label><span>Language</span><select name="language" defaultValue={settings.language}><option value="en">English</option><option value="so">Somali</option></select></label>
              <div className="settings-panel-note full"><MonitorCog size={17} /><div><strong>Personal to your account</strong><p>Coach and client accounts save their own theme and regional preferences independently.</p></div></div>
              <div className="account-form-footer full"><FormMessage error={preferencesState.error} success={preferencesState.success} /><button className="button primary" disabled={preferencesPending} type="submit"><Save size={15} /> {preferencesPending ? "Saving..." : "Save preferences"}</button></div>
            </form>
          </section>
        ) : null}

        {activeStep === "notifications" ? (
          <section className="settings-step-panel" id="notifications">
            <SettingsHeading eyebrow="Step 2 of 3" title="Notifications" description={role === "coach" ? "Send important updates to a client and control your own alerts." : "Messages from your coach and the alerts you want to receive."} icon={<BellRing size={19} />} />
            {role === "coach" ? (
              <form action={sendFormAction} className="notification-compose">
                <div className="settings-subheading"><div><strong>Send to a client</strong><span>The notification appears immediately in their dashboard bell and inbox.</span></div><Send size={17} /></div>
                <div className="account-form-grid">
                  <label><span>Client</span><select name="recipient_id" required defaultValue=""><option value="" disabled>Select a client</option>{recipients.map((client) => <option value={client.id} key={client.id}>{client.name} - {client.email}</option>)}</select></label>
                  <label><span>Title</span><input name="title" maxLength={120} placeholder="Example: Your new plan is ready" required /></label>
                  <label className="full"><span>Message</span><textarea name="message" rows={3} maxLength={1000} placeholder="Write a short, useful update for the client." required /></label>
                </div>
                <div className="account-form-footer"><FormMessage error={sendState.error} success={sendState.success} /><button className="button primary" disabled={sendPending || recipients.length === 0} type="submit"><Send size={15} /> {sendPending ? "Sending..." : "Send notification"}</button></div>
              </form>
            ) : null}

            <NotificationFeed role={role} notifications={notifications} />

            <form action={notificationsFormAction} className="settings-panel-form notification-preferences">
              <div className="settings-subheading"><div><strong>Delivery preferences</strong><span>Control which supporting reminders reach your account.</span></div></div>
              <div className="settings-toggle-list">
                <Toggle name="in_app_notifications" title="In-app notifications" description="Coach updates and important activity inside your SoFit dashboard." defaultChecked={settings.inAppNotifications} />
                <Toggle name="email_notifications" title="Email notifications" description="Account and coaching updates sent to your email." defaultChecked={settings.emailNotifications} />
                <Toggle name="session_reminders" title="Session reminders" description="Reminder before consultations and personal-training sessions." defaultChecked={settings.sessionReminders} />
                <Toggle name="weekly_summary" title="Weekly summary" description="A concise weekly overview of activity and progress." defaultChecked={settings.weeklySummary} />
              </div>
              <div className="account-form-footer"><FormMessage error={notificationsState.error} success={notificationsState.success} /><button className="button primary" disabled={notificationsPending} type="submit"><Save size={15} /> {notificationsPending ? "Saving..." : "Save notification settings"}</button></div>
            </form>
          </section>
        ) : null}

        {activeStep === "security" ? (
          <section className="settings-step-panel" id="security">
            <SettingsHeading eyebrow="Step 3 of 3" title="Password & security" description="Confirm your current password before creating a secure replacement." icon={<ShieldCheck size={19} />} />
            <form ref={passwordForm} action={passwordFormAction} className="account-form-grid settings-panel-form password-form">
              <PasswordField className="full" name="current_password" title="Current password" autoComplete="current-password" />
              <PasswordField name="new_password" title="New password" autoComplete="new-password" minLength={8} />
              <PasswordField name="confirm_password" title="Confirm new password" autoComplete="new-password" minLength={8} />
              <div className="settings-panel-note full"><KeyRound size={17} /><div><strong>Secure password guidance</strong><p>Use at least eight characters and avoid names, birthdays, or a password used elsewhere.</p></div></div>
              <div className="account-form-footer full"><FormMessage error={passwordState.error} success={passwordState.success} /><button className="button primary" disabled={passwordPending} type="submit"><KeyRound size={15} /> {passwordPending ? "Updating..." : "Update password"}</button></div>
            </form>
          </section>
        ) : null}

        <footer className="settings-security-footer">
          <div><span className="account-heading-icon"><Clock3 size={17} /></span><span><strong>Account created</strong><small>{createdAt}</small></span></div>
          <div><ShieldCheck size={16} /><span><strong>Protected workspace</strong><small>Your account details stay private.</small></span></div>
        </footer>
      </main>
    </div>
  );
}

function ThemeChoice({ value, title, description, icon, checked, onChange }: { value: ThemePreference; title: string; description: string; icon: ReactNode; checked: boolean; onChange: (theme: ThemePreference) => void }) {
  return <label className="theme-choice"><input type="radio" name="theme" value={value} checked={checked} onChange={() => onChange(value)} /><span className="theme-choice-preview">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><i aria-hidden="true" /></label>;
}

function NotificationFeed({ role, notifications }: { role: "coach" | "client"; notifications: SettingsWorkspaceProps["notifications"] }) {
  return (
    <section className="settings-notification-feed">
      <div className="settings-subheading"><div><strong>{role === "coach" ? "Recently sent" : "Recent coach updates"}</strong><span>{role === "coach" ? "A delivery record for your latest client notifications." : "Unread updates stay highlighted until you mark them as read."}</span></div><BellRing size={17} /></div>
      {notifications.length ? <div className="settings-notification-list">{notifications.map((item) => (
        <article className={item.isRead ? "is-read" : "is-unread"} key={item.id}>
          <span className="notification-feed-icon"><BellRing size={16} /></span>
          <div><div><strong>{item.title}</strong><time>{item.createdLabel}</time></div><p>{item.message}</p>{item.personName ? <small>{role === "coach" ? `Sent to ${item.personName}` : `From ${item.personName}`}</small> : null}</div>
          {role === "client" && !item.isRead ? <form action={markNotificationReadAction.bind(null, role, item.id)}><button type="submit">Mark read</button></form> : null}
        </article>
      ))}</div> : <div className="settings-empty-notifications"><BellRing size={18} /><span>{role === "coach" ? "No notifications sent yet." : "No coach notifications yet."}</span></div>}
    </section>
  );
}

function PasswordField({ className, name, title, autoComplete, minLength }: { className?: string; name: string; title: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return <label className={className}><span>{title}</span><div className="account-password-field"><input name={name} type={visible ? "text" : "password"} minLength={minLength} autoComplete={autoComplete} required /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? `Hide ${title.toLowerCase()}` : `Show ${title.toLowerCase()}`}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>;
}

function SettingsHeading({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon: ReactNode }) {
  return <div className="account-card-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div><span className="account-heading-icon">{icon}</span></div>;
}

function Toggle({ name, title, description, defaultChecked }: { name: string; title: string; description: string; defaultChecked: boolean }) {
  return <label className="settings-toggle"><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" name={name} defaultChecked={defaultChecked} /><i aria-hidden="true" /></label>;
}

function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`account-form-message ${error ? "error" : "success"}`} aria-live="polite">{success ? <CheckCircle2 size={15} /> : null}{error || success}</p>;
}
