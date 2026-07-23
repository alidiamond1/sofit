"use client";

import {
  Activity,
  Apple,
  BarChart3,
  Bell,
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
  Package as PackageIcon,
  PanelLeftClose,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import logo from "@/assets/png.png";
import logoIcon from "@/assets/icon.png";

type NavItem = { label: string; href: string; icon: LucideIcon; section: string };

const coachNav: NavItem[] = [
  { label: "Overview", href: "/coach", icon: Home, section: "Workspace" },
  { label: "Clients", href: "/coach/clients", icon: Users, section: "Workspace" },
  { label: "Invites", href: "/coach/invites", icon: Mail, section: "Workspace" },
  { label: "Services", href: "/coach/services", icon: Sparkles, section: "Coaching" },
  { label: "Packages", href: "/coach/packages", icon: PackageIcon, section: "Coaching" },
  { label: "Consultations", href: "/coach/consultations", icon: CalendarDays, section: "Coaching" },
  { label: "Diet plans", href: "/coach/diet-plans", icon: Apple, section: "Coaching" },
  { label: "Workout plans", href: "/coach/workout-plans", icon: Dumbbell, section: "Coaching" },
  { label: "Personal training", href: "/coach/personal-training", icon: Activity, section: "Coaching" },
  { label: "Check-ins", href: "/coach/check-ins", icon: ClipboardCheck, section: "Coaching" },
  { label: "Payments", href: "/coach/payments", icon: CreditCard, section: "Business" },
  { label: "Messages", href: "/coach/messages", icon: MessageCircle, section: "Business" },
  { label: "Analytics", href: "/coach/analytics", icon: BarChart3, section: "Business" },
  { label: "Settings", href: "/coach/settings", icon: Settings, section: "System" },
];

const clientNav: NavItem[] = [
  { label: "Home", href: "/client", icon: Home, section: "Today" },
  { label: "My plans", href: "/client/plans", icon: Utensils, section: "My coaching" },
  { label: "My sessions", href: "/client/sessions", icon: CalendarDays, section: "My coaching" },
  { label: "Check-in", href: "/client/check-in", icon: CheckCircle2, section: "My coaching" },
  { label: "Progress", href: "/client/progress", icon: BarChart3, section: "My coaching" },
  { label: "Messages", href: "/client/messages", icon: MessageCircle, section: "Account" },
  { label: "Payments", href: "/client/payments", icon: CreditCard, section: "Account" },
  { label: "Profile", href: "/client/profile", icon: UserRound, section: "Account" },
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
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
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
            <Link
              href={item.href}
              className={active ? "nav-link active" : "nav-link"}
              onClick={onNavigate}
              title={item.label}
            >
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}

export function AppShell({
  role,
  user,
  children,
}: {
  role: "coach" | "client";
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const items = role === "coach" ? coachNav : clientNav;
  const active = items.find(
    (item) =>
      pathname === item.href ||
      (item.href.split("/").length > 2 && pathname.startsWith(item.href)),
  );
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className={collapsed ? "portal-shell is-collapsed" : "portal-shell"}>
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
        <NavLinks items={items} pathname={pathname} />
        <div className="sidebar-footer">
          <div className="avatar small">{initials}</div>
          {!collapsed ? (
            <div className="sidebar-user-copy">
              <strong>{user.name}</strong>
              <span>{role === "coach" ? "Head coach" : "Elite member"}</span>
            </div>
          ) : null}
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
          <button className="icon-button notification-button" aria-label="Notifications">
            <Bell size={19} />
            <span />
          </button>
          <button className="profile-button">
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <strong>{user.name}</strong>
              <small>{role === "coach" ? "Coach" : "Client"}</small>
            </span>
            <ChevronDown size={15} />
          </button>
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
            <NavLinks items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        {items.slice(0, 4).map((item) => {
          const activeItem = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={activeItem ? "active" : ""}>
              <item.icon size={20} />
              <span>{item.label.split(" ")[0]}</span>
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
