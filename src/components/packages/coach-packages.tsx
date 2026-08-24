import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/primitives";
import type { ExerciseOption, MealOption, PlanClient } from "@/components/plans/plan-builders";
import { TierPackages, type PackageTier, type TierPackageSummary } from "./tier-packages";

async function clients(): Promise<PlanClient[]> {
  const rows = await database()("clients")
    .select("clients.id", "users.name", "users.email")
    .join("users", "users.id", "clients.user_id")
    .whereNot("clients.status", "churned")
    .orderBy("users.name");
  return rows.map((row) => ({ id: Number(row.id), name: row.name, email: row.email }));
}

export async function CoachPackagesPage() {
  await requireRole("coach");
  const db = database();
  const [clientRows, mealRows, exerciseRows, tierPackageRows] = await Promise.all([
    clients(),
    db("meal_library").select("id", "name", "meal_type", "calories", "protein_g", "carbs_g", "fat_g", "ingredients", "instructions", "media_url").where({ is_active: true }).orderByRaw("FIELD(meal_type, 'breakfast', 'lunch', 'dinner', 'snack')").orderBy("name"),
    db("exercise_library").select("id", "name", "muscle_group", "equipment", "difficulty", "motion_type", "media_url", "instructions").where({ is_active: true }).orderBy("muscle_group").orderBy("name"),
    db("tier_packages").select("*"),
  ]);

  const meals = mealRows.map((row) => ({
    ...row,
    id: Number(row.id),
    calories: row.calories == null ? null : Number(row.calories),
    protein_g: row.protein_g == null ? null : Number(row.protein_g),
    carbs_g: row.carbs_g == null ? null : Number(row.carbs_g),
    fat_g: row.fat_g == null ? null : Number(row.fat_g),
  })) as MealOption[];
  const exercises = exerciseRows.map((row) => ({ ...row, id: Number(row.id) })) as ExerciseOption[];

  const packages: Record<PackageTier, TierPackageSummary | null> = { beginner: null, silver: null, gold: null };
  for (const row of tierPackageRows) {
    packages[row.tier as PackageTier] = {
      tier: row.tier as PackageTier,
      title: row.title,
      days: Array.isArray(row.days) ? row.days : [],
    };
  }

  return (
    <>
      <PageHeader
        eyebrow="Ready-made offers"
        title="Packages"
        description="Add a Beginner, Silver, and Gold package once — workout and diet built together, day by day. Assign a client to a tier and their whole week is filled in automatically."
      />
      <TierPackages meals={meals} exercises={exercises} clients={clientRows} packages={packages} />
    </>
  );
}
