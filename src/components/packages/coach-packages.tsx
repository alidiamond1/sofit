import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/primitives";
import type { PlanClient } from "@/components/plans/plan-builders";
import { PackagesWorkspace, type PackageGroupOption, type PackageRow } from "./package-workspace";

async function clients(): Promise<PlanClient[]> {
  const rows = await database()("clients")
    .select("clients.id", "users.name", "users.email")
    .join("users", "users.id", "clients.user_id")
    .where({ "clients.status": "active", "users.is_active": true, "users.approval_status": "approved" })
    .orderBy("users.name");
  return rows.map((row) => ({ id: Number(row.id), name: row.name, email: row.email }));
}

export async function CoachPackagesPage() {
  await requireRole("coach");
  const t = await getTranslations("Packages.page");
  const db = database();
  const [clientRows, packageRows, dietGroupRows, workoutGroupRows] = await Promise.all([
    clients(),
    db("packages")
      .select("packages.*", "diet_groups.name as diet_group_name", "workout_groups.name as workout_group_name")
      .leftJoin("diet_groups", "diet_groups.id", "packages.diet_group_id")
      .leftJoin("workout_groups", "workout_groups.id", "packages.workout_group_id")
      .orderBy("packages.name"),
    db("diet_groups").select("id", "name").where({ is_active: true }).orderBy("name"),
    db("workout_groups").select("id", "name").where({ is_active: true }).orderBy("name"),
  ]);

  const packages: PackageRow[] = packageRows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    category: String(row.category),
    description: String(row.description || ""),
    price: Number(row.price),
    billingInterval: String(row.billing_interval),
    isActive: Boolean(row.is_active),
    dietGroupId: row.diet_group_id ? Number(row.diet_group_id) : null,
    workoutGroupId: row.workout_group_id ? Number(row.workout_group_id) : null,
    dietGroupName: row.diet_group_name ? String(row.diet_group_name) : null,
    workoutGroupName: row.workout_group_name ? String(row.workout_group_name) : null,
  }));
  const dietGroups: PackageGroupOption[] = dietGroupRows.map((row) => ({ id: Number(row.id), name: String(row.name) }));
  const workoutGroups: PackageGroupOption[] = workoutGroupRows.map((row) => ({ id: Number(row.id), name: String(row.name) }));

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <PackagesWorkspace packages={packages} dietGroups={dietGroups} workoutGroups={workoutGroups} clients={clientRows} />
    </>
  );
}
