import { ArrowDownRight, ArrowUpRight, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { MiniSparkline } from "./charts";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHead({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-head">
      <div>
        <h2>{title}</h2>
        {meta ? <p>{meta}</p> : null}
      </div>
      {action || (
        <button className="icon-button quiet" aria-label={`More options for ${title}`}>
          <MoreHorizontal size={18} />
        </button>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "blue";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function StatCard({
  label,
  value,
  change,
  trend = "up",
  note,
  icon,
  accent = "blue",
  points,
}: {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  note?: string;
  icon?: ReactNode;
  accent?: "blue" | "green" | "amber";
  points?: number[];
}) {
  return (
    <Card className={`stat-card accent-${accent}`}>
      <div className="stat-card-head">
        <span>{label}</span>
        {icon ? <i>{icon}</i> : null}
      </div>
      <div className="stat-card-main">
        <strong>{value}</strong>
        {points?.length ? <MiniSparkline values={points} tone={accent === "green" ? "green" : "blue"} /> : null}
      </div>
      <div className="stat-foot">
        {change ? (
          <span className={trend === "up" ? "trend up" : "trend down"}>
            {trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </span>
        ) : null}
        {note ? <small>{note}</small> : null}
      </div>
    </Card>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress-wrap">
      {label ? <span>{label}</span> : null}
      <div className="progress-track">
        <span style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  );
}

export function Avatar({
  name,
  tone = 0,
  src,
  className = "",
}: {
  name: string;
  tone?: number;
  src?: string | null;
  className?: string;
}) {
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return (
    <span className={`avatar tone-${tone % 5} ${className}`.trim()}>
      {src ? <Image src={src} alt={`${name} profile photo`} fill sizes="96px" unoptimized={src.startsWith("blob:") || src.startsWith("/api/avatars/")} /> : initials}
    </span>
  );
}
