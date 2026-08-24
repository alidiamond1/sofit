"use client";

import { Check, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useActionState, useState } from "react";
import {
  assignTierPackageAction,
  saveTierPackageAction,
  type TierPackageActionState,
} from "@/app/actions/tier-packages";
import { DAY_LABELS } from "@/lib/package-tiers";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { ExerciseMedia } from "@/components/plans/exercise-media";
import type { ExerciseOption, MealOption, PlanClient } from "@/components/plans/plan-builders";

export type PackageTier = "beginner" | "silver" | "gold";

export type TierPackageSummary = {
  tier: PackageTier;
  title: string;
  days: Array<{
    dayIndex: number;
    dayLabel: string;
    meals: Array<{ meal_id: number; time: string }>;
    exercises: Array<{ exercise_id: number; sets: number; reps: string; rpe: number; rest_seconds: number }>;
  }>;
};

const TIERS: PackageTier[] = ["beginner", "silver", "gold"];
const TIER_LABELS: Record<PackageTier, string> = { beginner: "Beginner", silver: "Silver", gold: "Gold" };
const initialState: TierPackageActionState = {};

type MealSlot = { key: string; mealId: number; time: string };
type ExerciseSlot = { key: string; exerciseId: number; sets: number; reps: string; rpe: number; restSeconds: number };

function ActionMessage({ state }: { state: TierPackageActionState }) {
  if (state.error) return <p className="form-message error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-message success" role="status">{state.success}</p>;
  return null;
}

function TierPackageComposer({
  tier,
  meals,
  exercises,
  existing,
  onSuccess,
}: {
  tier: PackageTier;
  meals: MealOption[];
  exercises: ExerciseOption[];
  existing: TierPackageSummary | null;
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState(async (previous: TierPackageActionState, formData: FormData) => {
    const result = await saveTierPackageAction(previous, formData);
    if (result.success) onSuccess();
    return result;
  }, initialState);
  const [activeDay, setActiveDay] = useState(0);
  const [mealDays, setMealDays] = useState<MealSlot[][]>(() => {
    const byIndex = new Map((existing?.days || []).map((day) => [day.dayIndex, day.meals]));
    return DAY_LABELS.map((_, dayIndex) => {
      const dayMeals = byIndex.get(dayIndex) || [];
      return dayMeals.map((meal, index) => ({ key: `m-${dayIndex}-${index}-${meal.meal_id}`, mealId: Number(meal.meal_id), time: String(meal.time) }));
    });
  });
  const [exerciseDays, setExerciseDays] = useState<ExerciseSlot[][]>(() => {
    const byIndex = new Map((existing?.days || []).map((day) => [day.dayIndex, day.exercises]));
    return DAY_LABELS.map((_, dayIndex) => {
      const dayExercises = byIndex.get(dayIndex) || [];
      return dayExercises.map((exercise, index) => ({
        key: `e-${dayIndex}-${index}-${exercise.exercise_id}`,
        exerciseId: Number(exercise.exercise_id),
        sets: Number(exercise.sets),
        reps: String(exercise.reps),
        rpe: Number(exercise.rpe),
        restSeconds: Number(exercise.rest_seconds),
      }));
    });
  });

  function addMeal() {
    if (!meals[0]) return;
    setMealDays((current) => current.map((slots, index) => index === activeDay
      ? [...slots, { key: `m-${activeDay}-${slots.length}-${meals[0].id}`, mealId: meals[0].id, time: "08:00" }]
      : slots));
  }
  function updateMeal(key: string, values: Partial<MealSlot>) {
    setMealDays((current) => current.map((slots, index) => index === activeDay
      ? slots.map((slot) => slot.key === key ? { ...slot, ...values } : slot)
      : slots));
  }
  function removeMeal(key: string) {
    setMealDays((current) => current.map((slots, index) => index === activeDay ? slots.filter((slot) => slot.key !== key) : slots));
  }

  function addExercise() {
    if (!exercises[0]) return;
    setExerciseDays((current) => current.map((slots, index) => index === activeDay
      ? [...slots, { key: `e-${activeDay}-${slots.length}-${exercises[0].id}`, exerciseId: exercises[0].id, sets: 3, reps: "8-12", rpe: 7, restSeconds: 90 }]
      : slots));
  }
  function updateExercise(key: string, values: Partial<ExerciseSlot>) {
    setExerciseDays((current) => current.map((slots, index) => index === activeDay
      ? slots.map((slot) => slot.key === key ? { ...slot, ...values } : slot)
      : slots));
  }
  function removeExercise(key: string) {
    setExerciseDays((current) => current.map((slots, index) => index === activeDay ? slots.filter((slot) => slot.key !== key) : slots));
  }

  const filledDayCount = mealDays.filter((slots) => slots.length > 0).length;
  const allDaysFilled = filledDayCount === 7;
  const activeMeals = mealDays[activeDay];
  const activeExercises = exerciseDays[activeDay];

  return (
    <form action={action} className="builder-form">
      <input type="hidden" name="tier" value={tier} />
      <div className="form-grid">
        <label className="full"><span>Package title</span><input name="title" placeholder="Gold - full coaching package" defaultValue={existing?.title || ""} required /></label>
      </div>

      <div className="day-tab-row">
        {DAY_LABELS.map((label, dayIndex) => (
          <button
            type="button"
            key={label}
            className={`day-tab${dayIndex === activeDay ? " active" : ""}${mealDays[dayIndex].length ? " is-filled" : ""}`}
            onClick={() => setActiveDay(dayIndex)}
          >
            {mealDays[dayIndex].length ? <Check size={11} /> : null}
            {label.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="day-panel-section">
        <div className="composer-list-head"><div><strong>{DAY_LABELS[activeDay]} workout</strong><span>{activeExercises.length} exercises (optional)</span></div><button className="button secondary small" type="button" onClick={addExercise} disabled={exercises.length === 0}><Plus size={14} /> Add exercise</button></div>
        {activeExercises.length === 0 ? <div className="builder-empty">Rest day, or add exercises for {DAY_LABELS[activeDay]}.</div> : (
          <div className="data-table-wrap">
            <table className="data-table tier-editable-table">
              <thead><tr><th></th><th>Exercise</th><th>Sets</th><th>Reps</th><th>RPE</th><th>Rest sec</th><th></th></tr></thead>
              <tbody>
                {activeExercises.map((selection) => {
                  const exercise = exercises.find((item) => item.id === selection.exerciseId) || exercises[0];
                  return (
                    <tr key={selection.key}>
                      <td>{exercise ? <ExerciseMedia variant="thumb" className="composer-thumb" url={exercise.media_url} name={exercise.name} muscleGroup={exercise.muscle_group} /> : null}</td>
                      <td><select value={selection.exerciseId} onChange={(event) => updateExercise(selection.key, { exerciseId: Number(event.target.value) })}>{exercises.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.muscle_group}</option>)}</select></td>
                      <td><input type="number" min="1" max="20" value={selection.sets} onChange={(event) => updateExercise(selection.key, { sets: Number(event.target.value) })} /></td>
                      <td><input value={selection.reps} onChange={(event) => updateExercise(selection.key, { reps: event.target.value })} /></td>
                      <td><input type="number" min="1" max="10" step="0.5" value={selection.rpe} onChange={(event) => updateExercise(selection.key, { rpe: Number(event.target.value) })} /></td>
                      <td><input type="number" min="0" max="1200" value={selection.restSeconds} onChange={(event) => updateExercise(selection.key, { restSeconds: Number(event.target.value) })} /></td>
                      <td><button type="button" className="icon-button" aria-label="Remove exercise" onClick={() => removeExercise(selection.key)}><Trash2 size={15} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="day-panel-section">
        <div className="composer-list-head"><div><strong>{DAY_LABELS[activeDay]} diet</strong><span>{activeMeals.length} meals</span></div><button className="button secondary small" type="button" onClick={addMeal} disabled={meals.length === 0}><Plus size={14} /> Add meal</button></div>
        {activeMeals.length === 0 ? <div className="builder-empty">Add at least one meal for {DAY_LABELS[activeDay]}.</div> : (
          <div className="data-table-wrap">
            <table className="data-table tier-editable-table">
              <thead><tr><th>Meal</th><th>Time</th><th>Kcal</th><th></th></tr></thead>
              <tbody>
                {activeMeals.map((slot) => {
                  const meal = meals.find((item) => item.id === slot.mealId);
                  return (
                    <tr key={slot.key}>
                      <td><select value={slot.mealId} onChange={(event) => updateMeal(slot.key, { mealId: Number(event.target.value) })}>{meals.map((item) => <option key={item.id} value={item.id}>{item.meal_type} - {item.name}</option>)}</select></td>
                      <td><input type="time" value={slot.time} onChange={(event) => updateMeal(slot.key, { time: event.target.value })} /></td>
                      <td>{meal?.calories || "-"}</td>
                      <td><button type="button" className="icon-button" aria-label="Remove meal" onClick={() => removeMeal(slot.key)}><Trash2 size={15} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <input
        type="hidden"
        name="days_json"
        value={JSON.stringify(DAY_LABELS.map((_, dayIndex) => ({
          dayIndex,
          meals: mealDays[dayIndex].map(({ mealId, time }) => ({ mealId, time })),
          exercises: exerciseDays[dayIndex].map(({ exerciseId, sets, reps, rpe, restSeconds }) => ({ exerciseId, sets, reps, rpe, restSeconds })),
        })))}
      />
      <ActionMessage state={state} />
      <div className="template-form-foot">
        <span className="days-progress">{filledDayCount} of 7 days have meals</span>
        <button className="button primary" type="submit" disabled={pending || !allDaysFilled}>{pending ? "Saving..." : existing ? "Save package" : "Create package"}</button>
      </div>
    </form>
  );
}

function AssignTierPackageForm({ tier, clients, onSuccess }: { tier: PackageTier; clients: PlanClient[]; onSuccess: () => void }) {
  const [state, action, pending] = useActionState(async (previous: TierPackageActionState, formData: FormData) => {
    const result = await assignTierPackageAction(previous, formData);
    if (result.success) onSuccess();
    return result;
  }, initialState);

  return (
    <form action={action} className="tier-assign-form">
      <input type="hidden" name="tier" value={tier} />
      <label>
        <span>Client</span>
        <select name="client_id" defaultValue="" required>
          <option value="" disabled>Select a client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>
      <button className="button primary" type="submit" disabled={pending || clients.length === 0}>{pending ? "Assigning..." : "Assign package"}</button>
      <ActionMessage state={state} />
    </form>
  );
}

function TierPackageCard({ tier, meals, exercises, clients, existing }: { tier: PackageTier; meals: MealOption[]; exercises: ExerciseOption[]; clients: PlanClient[]; existing: TierPackageSummary | null }) {
  const [buildOpen, setBuildOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const totalMeals = existing ? existing.days.reduce((sum, day) => sum + day.meals.length, 0) : 0;
  const totalExercises = existing ? existing.days.reduce((sum, day) => sum + day.exercises.length, 0) : 0;
  const workoutDays = existing ? existing.days.filter((day) => day.exercises.length > 0).length : 0;

  return (
    <article className={`tier-package-card tier-${tier}`}>
      <div className="tier-package-head">
        <span className="tier-badge">{TIER_LABELS[tier]}</span>
        {existing ? <span className="tier-status is-set">Built</span> : <span className="tier-status">Not built yet</span>}
      </div>
      <h3>{existing?.title || `${TIER_LABELS[tier]} package`}</h3>
      <p>Diet and workout for every day of the week, built once and assigned together.</p>
      {existing ? (
        <div className="tier-package-stats">
          <div><strong>{totalMeals}</strong><span>meals</span></div>
          <div><strong>{workoutDays}</strong><span>workout days</span></div>
          <div><strong>{totalExercises}</strong><span>exercises</span></div>
        </div>
      ) : null}
      <div className="tier-package-actions">
        <button className="button secondary" type="button" onClick={() => setBuildOpen(true)}>{existing ? "Edit package" : "Add package"}</button>
        <button className="button primary" type="button" onClick={() => setAssignOpen(true)} disabled={!existing || clients.length === 0}><UserPlus size={14} /> Assign</button>
      </div>

      {buildOpen ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setBuildOpen(false)}>
          <div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={`${TIER_LABELS[tier]} package`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setBuildOpen(false)}><X size={18} /></button>
            <section className="builder-panel composer-panel">
              <header><span className="eyebrow">{TIER_LABELS[tier]} tier</span><h2>Package</h2><p>Build every day once — workout and diet stay linked together. Assigning fills a client&apos;s whole week automatically.</p></header>
              <TierPackageComposer tier={tier} meals={meals} exercises={exercises} existing={existing} onSuccess={() => setBuildOpen(false)} />
            </section>
          </div>
        </div></ModalPortal>
      ) : null}

      {assignOpen ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setAssignOpen(false)}>
          <div className="plan-modal" role="dialog" aria-modal="true" aria-label={`Assign ${TIER_LABELS[tier]} package`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setAssignOpen(false)}><X size={18} /></button>
            <section className="builder-panel tier-modal-panel">
              <header><span className="eyebrow">Client assignment</span><h2>Assign {TIER_LABELS[tier]} package</h2><p>Their active diet plan and workout program will be replaced with this week&apos;s content.</p></header>
              <AssignTierPackageForm tier={tier} clients={clients} onSuccess={() => setAssignOpen(false)} />
            </section>
          </div>
        </div></ModalPortal>
      ) : null}
    </article>
  );
}

export function TierPackages({ meals, exercises, clients, packages }: { meals: MealOption[]; exercises: ExerciseOption[]; clients: PlanClient[]; packages: Record<PackageTier, TierPackageSummary | null> }) {
  return (
    <div className="tier-package-grid">
      {TIERS.map((tier) => <TierPackageCard key={tier} tier={tier} meals={meals} exercises={exercises} clients={clients} existing={packages[tier]} />)}
    </div>
  );
}
