export type PlanHistoryItem = { key: string; name: string; day: string; dates: string[] };

export type PlanHistoryRecord = {
  id: number;
  clientId: number;
  client: string;
  title: string;
  version: number;
  status: string;
  startsOn: string;
  metric: number | null;
  items: PlanHistoryItem[];
};

export function groupPlanHistory<T extends PlanHistoryRecord>(plans: T[], filters: { search: string; status: string; progress: string; date: string }) {
  const query = filters.search.trim().toLowerCase();
  const groups = new Map<number, { clientId: number; client: string; plans: T[] }>();
  for (const plan of plans) {
    if (query && !`${plan.client} ${plan.title}`.toLowerCase().includes(query)) continue;
    if (filters.status && plan.status !== filters.status) continue;
    const done = plan.items.filter((item) => item.dates.includes(filters.date)).length;
    if (filters.progress === "done" && done === 0) continue;
    if (filters.progress === "pending" && done === plan.items.length) continue;
    const group = groups.get(plan.clientId) || { clientId: plan.clientId, client: plan.client, plans: [] };
    group.plans.push(plan);
    groups.set(plan.clientId, group);
  }
  return [...groups.values()];
}
