"use client";

import {
  Activity,
  Apple,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  Footprints,
  Home,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Package as PackageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useEffect, useState, useTransition, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { markMessageReadAction } from "@/app/actions/messages";
import { updateLanguageAction, updateThemeAction } from "@/app/actions/profile";
import { Avatar } from "./primitives";
import { ThemeSync, type ThemePreference } from "./theme-sync";
import logo from "@/assets/sofit-logo.png";
import logoIcon from "@/assets/icon.png";

type NavItem = { label: string; mobileLabel?: string; href: string; icon: LucideIcon; section: string };
type NavItemConfig = { key: string; mobileKey?: string; href: string; icon: LucideIcon; sectionKey: string };
type ShellNotification = { id: number; kind: "notification" | "message"; title: string; message: string; createdLabel: string; isRead: boolean; senderName: string; href: string };

const coachNavConfig: NavItemConfig[] = [
  { key: "overview", href: "/coach", icon: Home, sectionKey: "workspace" },
  { key: "clients", href: "/coach/clients", icon: Users, sectionKey: "workspace" },
  { key: "invites", href: "/coach/invites", icon: Mail, sectionKey: "workspace" },
  { key: "packages", href: "/coach/packages", icon: PackageIcon, sectionKey: "coaching" },
  { key: "assignments", href: "/coach/assignments", icon: ClipboardCheck, sectionKey: "coaching" },
  { key: "consultations", href: "/coach/consultations", icon: CalendarDays, sectionKey: "coaching" },
  { key: "dietPlans", href: "/coach/diet-plans", icon: Apple, sectionKey: "coaching" },
  { key: "workoutPlans", href: "/coach/workout-plans", icon: Dumbbell, sectionKey: "coaching" },
  { key: "schedule", href: "/coach/schedule", icon: CalendarCheck, sectionKey: "coaching" },
  { key: "personalTraining", href: "/coach/personal-training", icon: Activity, sectionKey: "coaching" },
  { key: "checkIns", href: "/coach/check-ins", icon: ClipboardCheck, sectionKey: "coaching" },
  { key: "transformations", href: "/coach/transformations", icon: Sparkles, sectionKey: "coaching" },
  { key: "payments", href: "/coach/payments", icon: CreditCard, sectionKey: "business" },
  { key: "messages", href: "/coach/messages", icon: MessageCircle, sectionKey: "business" },
  { key: "analytics", href: "/coach/analytics", icon: BarChart3, sectionKey: "business" },
  { key: "notifications", href: "/coach/settings#notifications", icon: Bell, sectionKey: "account" },
  { key: "profile", href: "/coach/profile", icon: UserRound, sectionKey: "account" },
  { key: "settings", href: "/coach/settings", icon: Settings, sectionKey: "account" },
];

const clientNavConfig: NavItemConfig[] = [
  { key: "home", href: "/client", icon: Home, sectionKey: "today" },
  { key: "dietPlan", href: "/client/diet-plan", icon: Apple, sectionKey: "myCoaching" },
  { key: "workoutPlan", href: "/client/workout-plan", icon: Dumbbell, sectionKey: "myCoaching" },
  { key: "walking", href: "/client/walking", icon: Footprints, sectionKey: "myCoaching" },
  { key: "mySessions", mobileKey: "sessionsShort", href: "/client/sessions", icon: CalendarDays, sectionKey: "myCoaching" },
  { key: "checkIn", href: "/client/check-in", icon: CheckCircle2, sectionKey: "myCoaching" },
  { key: "health", href: "/client/health", icon: BarChart3, sectionKey: "myCoaching" },
  { key: "messages", href: "/client/messages", icon: MessageCircle, sectionKey: "support" },
  { key: "payments", href: "/client/payments", icon: CreditCard, sectionKey: "support" },
  { key: "profile", href: "/client/profile", icon: UserRound, sectionKey: "account" },
  { key: "settings", href: "/client/settings", icon: Settings, sectionKey: "account" },
];

function useNavItems(role: "coach" | "client"): NavItem[] {
  const t = useTranslations("Nav");
  const prefix = role === "coach" ? "coach" : "client";
  const config = role === "coach" ? coachNavConfig : clientNavConfig;
  return config.map((item) => ({
    label: t(`${prefix}.${item.key}`),
    mobileLabel: item.mobileKey ? t(`${prefix}.${item.mobileKey}`) : undefined,
    href: item.href,
    icon: item.icon,
    section: t(`sections.${item.sectionKey}`),
  }));
}

function SoFitMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="SoFit home">
      <Image
        src={compact ? logoIcon : logo}
        alt="SoFit"
        className={compact ? "logo-icon" : "logo-image"}
        priority
      />
    </Link>
  );
}

function NavLinks({
  items,
  pathname,
  unreadMessageCount,
  unreadCount,
  onOpenNotifications,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  unreadMessageCount: number;
  unreadCount: number;
  onOpenNotifications?: () => void;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Topbar");
  return (
    <nav className="side-nav" aria-label="Portal navigation">
      {items.map((item, index) => {
        const active =
          pathname === item.href ||
          (item.href.split("/").length > 2 && pathname.startsWith(item.href));
        const isNotificationsItem = item.href.endsWith("#notifications");
        return (
          <Fragment key={item.href}>
            {index === 0 || items[index - 1].section !== item.section ? (
              <span className="nav-section">{item.section}</span>
            ) : null}
            {isNotificationsItem && onOpenNotifications ? (
              <button
                type="button"
                className={active ? "nav-link active" : "nav-link"}
                onClick={() => { onOpenNotifications(); onNavigate?.(); }}
                title={item.label}
              >
                <item.icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {unreadCount > 0 ? (
                  <b className="nav-unread-count" aria-label={t("unreadNotificationsAria", { count: unreadCount })}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </b>
                ) : null}
              </button>
            ) : (
              <Link
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
                onClick={onNavigate}
                title={item.label}
              >
                <item.icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.href.endsWith("/messages") && unreadMessageCount > 0 ? (
                  <b className="nav-unread-count" aria-label={t("unreadMessagesAria", { count: unreadMessageCount })}>
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </b>
                ) : null}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export function AppShell({
  role,
  user,
  theme,
  notifications,
  unreadCount,
  unreadMessageCount,
  activeClients,
  children,
}: {
  role: "coach" | "client";
  user: { name: string; email: string; avatarPath?: string | null };
  theme: ThemePreference;
  notifications: ShellNotification[];
  unreadCount: number;
  unreadMessageCount: number;
  activeClients?: { clients: { id: number; name: string; avatarPath: string | null }[]; total: number };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const tNav = useTranslations("Nav");
  const tTop = useTranslations("Topbar");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(theme);
  const [resolvedDark, setResolvedDark] = useState(theme === "dark");
  const [themePending, startThemeTransition] = useTransition();
  const [localePending, startLocaleTransition] = useTransition();
  const items = useNavItems(role);
  const active = items.find(
    (item) =>
      pathname === item.href ||
      (item.href.split("/").length > 2 && pathname.startsWith(item.href)),
  );
  const profileHref = role === "coach" ? "/coach/profile" : "/client/profile";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setResolvedDark(document.documentElement.dataset.theme === "dark"));
    return () => window.cancelAnimationFrame(frame);
  }, [themePreference]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [router]);

  function toggleTheme() {
    const previousTheme = themePreference;
    const previousResolved = resolvedDark;
    const nextTheme = resolvedDark ? "light" : "dark";
    setThemePreference(nextTheme);
    setResolvedDark(!resolvedDark);
    startThemeTransition(async () => {
      const result = await updateThemeAction(role, nextTheme);
      if (result.error) {
        setThemePreference(previousTheme);
        setResolvedDark(previousResolved);
      }
    });
  }

  function toggleLocale() {
    const nextLocale = locale === "en" ? "so" : "en";
    startLocaleTransition(async () => {
      const result = await updateLanguageAction(role, nextLocale);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className={collapsed ? "portal-shell is-collapsed" : "portal-shell"}>
      <ThemeSync preference={themePreference} />
      <aside className={role === "coach" ? "desktop-sidebar sidebar-coach" : "desktop-sidebar"}>
        <div className="sidebar-brand-row">
          <SoFitMark compact={collapsed} />
          <button
            className="icon-button sidebar-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? tTop("expandSidebar") : tTop("collapseSidebar")}
            title={collapsed ? tTop("expandSidebar") : tTop("collapseSidebar")}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <NavLinks items={items} pathname={pathname} unreadMessageCount={unreadMessageCount} unreadCount={unreadCount} onOpenNotifications={() => setNotificationsOpen(true)} />
        {role === "coach" && !collapsed && activeClients && activeClients.clients.length > 0 ? (
          <div className="sidebar-active-clients">
            <span className="sidebar-active-clients-label">{tTop("activeClients")}</span>
            <div className="sidebar-active-clients-row">
              <div className="sidebar-active-clients-stack">
                {activeClients.clients.map((client) => (
                  <Avatar key={client.id} name={client.name} src={client.avatarPath} className="tiny" />
                ))}
              </div>
              <strong>{tTop("activeClientsCount", { count: activeClients.total })}</strong>
            </div>
          </div>
        ) : null}
        <div className="sidebar-footer">
          <Link className="sidebar-user-link" href={profileHref} title={tTop("openProfile")}>
            <Avatar name={user.name} src={user.avatarPath} className="small" />
            {!collapsed ? (
              <div className="sidebar-user-copy">
                <strong>{user.name}</strong>
                <span>{role === "coach" ? tTop("headCoach") : tTop("clientProfile")}</span>
              </div>
            ) : null}
          </Link>
          <form action={logoutAction}>
            <button className="icon-button" aria-label={tTop("signOut")} type="submit">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </aside>

      <div className="portal-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label={tTop("openMenu")}
          >
            <Menu size={21} />
          </button>
          <div className="mobile-brand"><SoFitMark /></div>
          <div className="page-crumb">
            <span>{role === "coach" ? tTop("coachDashboard") : tTop("clientDashboard")}</span>
            <strong>{active?.label || tNav(role === "coach" ? "coach.overview" : "client.home")}</strong>
          </div>
          <label className="top-search">
            <Search size={17} />
            <input placeholder={tTop("searchPlaceholder")} aria-label={tTop("search")} />
            <kbd>? K</kbd>
          </label>
          <button className="icon-button topbar-theme-toggle" type="button" onClick={toggleTheme} disabled={themePending} aria-label={resolvedDark ? tTop("switchToLightMode") : tTop("switchToDarkMode")} title={resolvedDark ? tTop("lightMode") : tTop("darkMode")}>
            <span className="theme-toggle-icon">{resolvedDark ? <Sun size={18} /> : <Moon size={18} />}</span>
          </button>
          <button className="icon-button topbar-language-toggle" type="button" onClick={toggleLocale} disabled={localePending} aria-label={locale === "en" ? tTop("switchToSomali") : tTop("switchToEnglish")} title={locale === "en" ? tTop("switchToSomali") : tTop("switchToEnglish")}>
            <span className="language-toggle-code">{locale === "en" ? "SO" : "EN"}</span>
          </button>
          <div className="topbar-notification-wrap">
            <button className="icon-button notification-button" aria-label={tTop("notifications")} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}>
              <Bell size={19} />
              {unreadCount > 0 ? <span><b>{unreadCount > 9 ? "9+" : unreadCount}</b></span> : null}
            </button>
            {notificationsOpen ? (
              <section className="notification-popover" aria-label={tTop("notifications")}>
                <header><div><span className="eyebrow">{tTop("notificationsEyebrow")}</span><strong>{tTop("notifications")}</strong></div>{unreadCount ? <small>{tTop("unreadCount", { count: unreadCount })}</small> : <small>{tTop("allCaughtUp")}</small>}</header>
                {notifications.length ? <div className="notification-popover-list">{notifications.map((item) => (
                  <article className={item.isRead ? "is-read" : "is-unread"} key={`${item.kind}-${item.id}`}>
                    <span className="notification-item-icon">{item.kind === "message" ? <MessageCircle size={15} /> : <Bell size={15} />}</span>
                    <Link className="notification-item-copy" href={item.href} onClick={() => setNotificationsOpen(false)}><strong>{item.title}</strong><p>{item.message}</p><small>{item.senderName} - {item.createdLabel}</small></Link>
                    {!item.isRead ? <form action={item.kind === "message" ? markMessageReadAction.bind(null, role, item.id) : markNotificationReadAction.bind(null, role, item.id)}><button type="submit" aria-label={tTop("markAsRead", { title: item.title })}><CheckCircle2 size={15} /></button></form> : null}
                  </article>
                ))}</div> : <div className="notification-popover-empty"><Bell size={19} /><span>{tTop("noNotifications")}</span></div>}
                <Link href={unreadMessageCount ? `/${role}/messages` : `/${role}/settings#notifications`} onClick={() => setNotificationsOpen(false)}>{unreadMessageCount ? tTop("openMessageInbox") : tTop("openNotificationSettings")}</Link>
              </section>
            ) : null}
          </div>
          <Link className="profile-button" href={profileHref} aria-label={tTop("openProfile")}>
            <Avatar name={user.name} src={user.avatarPath} />
            <span className="profile-copy">
              <strong>{user.name}</strong>
              <small>{role === "coach" ? tTop("roleCoach") : tTop("roleClient")}</small>
            </span>
            <ChevronDown size={15} />
          </Link>
        </header>
        <main className="portal-content">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-drawer-head">
              <SoFitMark />
              <button className="icon-button" onClick={() => setMobileOpen(false)} aria-label={tTop("closeMenu")}>
                <X size={20} />
              </button>
            </div>
            <NavLinks items={items} pathname={pathname} unreadMessageCount={unreadMessageCount} unreadCount={unreadCount} onOpenNotifications={() => setNotificationsOpen(true)} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        {items.slice(0, 4).map((item) => {
          const activeItem = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={activeItem ? "active" : ""}>
              <item.icon size={20} />
              <span>{item.mobileLabel || item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
          <span>{tTop("more")}</span>
        </button>
      </nav>
    </div>
  );
}
