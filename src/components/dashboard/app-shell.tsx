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
  Home,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Package as PackageIcon,
  PanelLeftClose,
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
import { Fragment, useEffect, useState, useTransition, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { markMessageReadAction } from "@/app/actions/messages";
import { updateThemeAction } from "@/app/actions/profile";
import logo from "@/assets/png.png";
import logoIcon from "@/assets/icon.png";
import { Avatar } from "./primitives";
import { ThemeSync, type ThemePreference } from "./theme-sync";

type NavItem = { label: string; mobileLabel?: string; href: string; icon: LucideIcon; section: string };
type ShellNotification = { id: number; kind: "notification" | "message"; title: string; message: string; createdLabel: string; isRead: boolean; senderName: string; href: string };

const coachNav: NavItem[] = [
  { label: "Overview", href: "/coach", icon: Home, section: "Workspace" },
  { label: "Clients", href: "/coach/clients", icon: Users, section: "Workspace" },
  { label: "Invites", href: "/coach/invites", icon: Mail, section: "Workspace" },
  { label: "Services", href: "/coach/services", icon: Sparkles, section: "Coaching" },
  { label: "Packages", href: "/coach/packages", icon: PackageIcon, section: "Coaching" },
  { label: "Consultations", href: "/coach/consultations", icon: CalendarDays, section: "Coaching" },
  { label: "Diet plans", href: "/coach/diet-plans", icon: Apple, section: "Coaching" },
  { label: "Workout plans", href: "/coach/workout-plans", icon: Dumbbell, section: "Coaching" },
  { label: "Schedule", href: "/coach/schedule", icon: CalendarCheck, section: "Coaching" },
  { label: "Personal training", href: "/coach/personal-training", icon: Activity, section: "Coaching" },
  { label: "Check-ins", href: "/coach/check-ins", icon: ClipboardCheck, section: "Coaching" },
  { label: "Payments", href: "/coach/payments", icon: CreditCard, section: "Business" },
  { label: "Messages", href: "/coach/messages", icon: MessageCircle, section: "Business" },
  { label: "Analytics", href: "/coach/analytics", icon: BarChart3, section: "Business" },
  { label: "Notifications", href: "/coach/settings#notifications", icon: Bell, section: "Account" },
  { label: "Profile", href: "/coach/profile", icon: UserRound, section: "Account" },
  { label: "Settings", href: "/coach/settings", icon: Settings, section: "Account" },
];

const clientNav: NavItem[] = [
  { label: "Home", href: "/client", icon: Home, section: "Today" },
  { label: "Diet plan", href: "/client/diet-plan", icon: Apple, section: "My coaching" },
  { label: "Workout plan", href: "/client/workout-plan", icon: Dumbbell, section: "My coaching" },
  { label: "My sessions", mobileLabel: "Sessions", href: "/client/sessions", icon: CalendarDays, section: "My coaching" },
  { label: "Check-in", href: "/client/check-in", icon: CheckCircle2, section: "My coaching" },
  { label: "Progress", href: "/client/progress", icon: BarChart3, section: "My coaching" },
  { label: "Messages", href: "/client/messages", icon: MessageCircle, section: "Support" },
  { label: "Payments", href: "/client/payments", icon: CreditCard, section: "Support" },
  { label: "Profile", href: "/client/profile", icon: UserRound, section: "Account" },
  { label: "Settings", href: "/client/settings", icon: Settings, section: "Account" },
];

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
  return (
    <nav className="side-nav" aria-label="Portal navigation">
      {items.map((item, index) => {
        const active =
          pathname === item.href ||
          (item.href.split("/").length > 2 && pathname.startsWith(item.href));
        return (
          <Fragment key={item.href}>
            {index === 0 || items[index - 1].section !== item.section ? (
              <span className="nav-section">{item.section}</span>
            ) : null}
            {item.label === "Notifications" && onOpenNotifications ? (
              <button
                type="button"
                className={active ? "nav-link active" : "nav-link"}
                onClick={() => { onOpenNotifications(); onNavigate?.(); }}
                title={item.label}
              >
                <item.icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {unreadCount > 0 ? (
                  <b className="nav-unread-count" aria-label={`${unreadCount} unread notifications`}>
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
                  <b className="nav-unread-count" aria-label={`${unreadMessageCount} unread messages`}>
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
  children,
}: {
  role: "coach" | "client";
  user: { name: string; email: string; avatarPath?: string | null };
  theme: ThemePreference;
  notifications: ShellNotification[];
  unreadCount: number;
  unreadMessageCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(theme);
  const [resolvedDark, setResolvedDark] = useState(theme === "dark");
  const [themePending, startThemeTransition] = useTransition();
  const items = role === "coach" ? coachNav : clientNav;
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

  return (
    <div className={collapsed ? "portal-shell is-collapsed" : "portal-shell"}>
      <ThemeSync preference={themePreference} />
      <aside className="desktop-sidebar">
        <div className="sidebar-brand-row">
          <SoFitMark compact={collapsed} />
          <button
            className="icon-button sidebar-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label="Toggle sidebar"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <NavLinks items={items} pathname={pathname} unreadMessageCount={unreadMessageCount} unreadCount={unreadCount} onOpenNotifications={() => setNotificationsOpen(true)} />
        <div className="sidebar-footer">
          <Link className="sidebar-user-link" href={profileHref} title="Open profile">
            <Avatar name={user.name} src={user.avatarPath} className="small" />
            {!collapsed ? (
              <div className="sidebar-user-copy">
                <strong>{user.name}</strong>
                <span>{role === "coach" ? "Head coach" : "Client profile"}</span>
              </div>
            ) : null}
          </Link>
          <form action={logoutAction}>
            <button className="icon-button" aria-label="Sign out" type="submit">
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
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
          <div className="mobile-brand"><SoFitMark /></div>
          <div className="page-crumb">
            <span>{role === "coach" ? "Coach dashboard" : "Client dashboard"}</span>
            <strong>{active?.label || "Overview"}</strong>
          </div>
          <label className="top-search">
            <Search size={17} />
            <input placeholder="Search anything" aria-label="Search" />
            <kbd>? K</kbd>
          </label>
          <button className="icon-button topbar-theme-toggle" type="button" onClick={toggleTheme} disabled={themePending} aria-label={resolvedDark ? "Switch to light mode" : "Switch to dark mode"} title={resolvedDark ? "Light mode" : "Dark mode"}>
            <span className="theme-toggle-icon">{resolvedDark ? <Sun size={18} /> : <Moon size={18} />}</span>
          </button>
          <div className="topbar-notification-wrap">
            <button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}>
              <Bell size={19} />
              {unreadCount > 0 ? <span><b>{unreadCount > 9 ? "9+" : unreadCount}</b></span> : null}
            </button>
            {notificationsOpen ? (
              <section className="notification-popover" aria-label="Recent notifications">
                <header><div><span className="eyebrow">Updates</span><strong>Notifications</strong></div>{unreadCount ? <small>{unreadCount} unread</small> : <small>All caught up</small>}</header>
                {notifications.length ? <div className="notification-popover-list">{notifications.map((item) => (
                  <article className={item.isRead ? "is-read" : "is-unread"} key={`${item.kind}-${item.id}`}>
                    <span className="notification-item-icon">{item.kind === "message" ? <MessageCircle size={15} /> : <Bell size={15} />}</span>
                    <Link className="notification-item-copy" href={item.href} onClick={() => setNotificationsOpen(false)}><strong>{item.title}</strong><p>{item.message}</p><small>{item.senderName} - {item.createdLabel}</small></Link>
                    {!item.isRead ? <form action={item.kind === "message" ? markMessageReadAction.bind(null, role, item.id) : markNotificationReadAction.bind(null, role, item.id)}><button type="submit" aria-label={`Mark ${item.title} as read`}><CheckCircle2 size={15} /></button></form> : null}
                  </article>
                ))}</div> : <div className="notification-popover-empty"><Bell size={19} /><span>No notifications yet.</span></div>}
                <Link href={unreadMessageCount ? `/${role}/messages` : `/${role}/settings#notifications`} onClick={() => setNotificationsOpen(false)}>{unreadMessageCount ? "Open message inbox" : "Open notification settings"}</Link>
              </section>
            ) : null}
          </div>
          <Link className="profile-button" href={profileHref} aria-label="Open profile">
            <Avatar name={user.name} src={user.avatarPath} />
            <span className="profile-copy">
              <strong>{user.name}</strong>
              <small>{role === "coach" ? "Coach" : "Client"}</small>
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
              <button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
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
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
