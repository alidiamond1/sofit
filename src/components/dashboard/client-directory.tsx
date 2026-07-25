"use client";

import {
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  Search,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Avatar, Badge, ProgressBar } from "./primitives";

export type ClientDirectoryRow = {
  id: number;
  name: string;
  email: string;
  avatarPath: string | null;
  status: string;
  pipelineStage: string;
  joined: string;
  service: string | null;
  packageName: string | null;
  packageCategory: string | null;
  adherence: number;
};

const stages = [
  { key: "all", label: "All clients", icon: UsersRound },
  { key: "lead", label: "Lead", icon: CircleDashed },
  { key: "onboarding", label: "Onboarding", icon: RefreshCw },
  { key: "active", label: "Active", icon: UserRoundCheck },
  { key: "renewal", label: "Renewal", icon: CheckCircle2 },
] as const;

function badgeTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "paused" || status === "onboarding") return "warning";
  if (status === "churned") return "danger";
  return "neutral";
}

export function ClientDirectory({ clients }: { clients: ClientDirectoryRow[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const counts = useMemo(() => {
    const result = new Map<string, number>([["all", clients.length]]);
    for (const client of clients) result.set(client.pipelineStage, (result.get(client.pipelineStage) || 0) + 1);
    return result;
  }, [clients]);

  const filtered = useMemo(() => clients.filter((client) => {
    const matchesStage = stage === "all" || client.pipelineStage === stage;
    const matchesStatus = status === "all" || client.status === status;
    const haystack = [client.name, client.email, client.service, client.packageName, client.packageCategory]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesStage && matchesStatus && (!deferredQuery || haystack.includes(deferredQuery));
  }), [clients, deferredQuery, stage, status]);

  const hasFilters = Boolean(query || stage !== "all" || status !== "all");

  function resetFilters() {
    setQuery("");
    setStage("all");
    setStatus("all");
  }

  return (
    <div className="client-management">
      <section className="client-pipeline" aria-labelledby="client-pipeline-title">
        <div className="client-pipeline-heading">
          <div>
            <span className="eyebrow">Live pipeline</span>
            <h2 id="client-pipeline-title">Client journey</h2>
          </div>
          <p>Select a stage to focus the directory below.</p>
        </div>
        <div className="client-pipeline-steps">
          {stages.map((item, index) => {
            const Icon = item.icon;
            const selected = stage === item.key;
            return (
              <button
                className={`client-pipeline-step${selected ? " selected" : ""}`}
                key={item.key}
                type="button"
                onClick={() => setStage(item.key)}
                aria-pressed={selected}
              >
                <span className="client-step-icon"><Icon size={17} /></span>
                <span className="client-step-copy"><strong>{item.label}</strong><small>{counts.get(item.key) || 0} clients</small></span>
                {index > 0 ? <span className="client-step-index">0{index}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="client-directory-card" aria-labelledby="client-directory-title">
        <div className="client-directory-heading">
          <div>
            <span className="eyebrow">Client roster</span>
            <h2 id="client-directory-title">Client directory</h2>
            <p>{filtered.length} of {clients.length} clients shown</p>
          </div>
          <div className="client-directory-controls">
            <label className="client-search">
              <Search size={17} />
              <span className="sr-only">Search clients</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or package" />
            </label>
            <label className="client-status-filter">
              <span className="sr-only">Filter by status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </select>
            </label>
            {hasFilters ? <button className="client-clear-filter" type="button" onClick={resetFilters}>Clear</button> : null}
          </div>
        </div>

        <div className="client-list-head" aria-hidden="true">
          <span>Client</span><span>Program</span><span>Journey</span><span>Adherence</span><span>Joined</span>
        </div>
        <div className="client-records">
          {filtered.map((client, index) => (
            <article className="client-record" key={client.id}>
              <div className="client-record-person">
                <Avatar name={client.name} tone={index} src={client.avatarPath} />
                <div><strong>{client.name}</strong><span>{client.email}</span></div>
              </div>
              <div className="client-record-program" data-label="Program">
                <strong>{client.packageName || "No package assigned"}</strong>
                <span>{client.service || "Service not assigned"}</span>
              </div>
              <div className="client-record-journey" data-label="Journey">
                <Badge tone={badgeTone(client.status)}>{client.status}</Badge>
                <span className="client-stage-dot"><i />{client.pipelineStage}</span>
              </div>
              <div className="client-record-adherence" data-label="Adherence">
                <ProgressBar value={client.adherence} />
              </div>
              <div className="client-record-joined" data-label="Joined"><strong>{client.joined}</strong><span>Client since</span></div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div className="client-directory-empty">
              <Search size={22} />
              <h3>No clients match this view</h3>
              <p>Try another name, status, or pipeline stage.</p>
              <button type="button" className="button secondary small" onClick={resetFilters}>Reset filters</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
