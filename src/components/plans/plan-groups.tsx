"use client";

import { AlertTriangle, Archive, ArchiveRestore, Dumbbell, Eye, Pencil, Plus, Salad, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  deleteDietGroupAction,
  deleteWorkoutGroupAction,
  saveDietGroupAction,
  saveWorkoutGroupAction,
  setDietGroupActiveAction,
  setWorkoutGroupActiveAction,
  type PlanGroupActionState,
} from "@/app/actions/plan-groups";
import { DAY_LABELS } from "@/lib/package-tiers";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { Badge, Card } from "@/components/dashboard/primitives";
import { ExerciseMedia } from "./exercise-media";
import type { ExerciseOption, MealOption } from "./plan-builders";

/** `DAY_LABELS` (from lib/package-tiers.ts) only drives ordering/indexing here —
 *  the actual displayed text always comes from the translated `Common.days`
 *  array below, looked up by the same index, so day names localize cleanly
 *  without touching the day-index-keyed data shape saved to the database. */
function useDayLabels(): string[] {
  const t = useTranslations("Common");
  return t.raw("days") as string[];
}

export type DietGroupSummary = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  days: Array<{ dayIndex: number; dayLabel: string; meals: Array<{ meal_id: number; time: string }> }>;
};

export type WorkoutGroupSummary = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  days: Array<{ dayIndex: number; dayLabel: string; exercises: Array<{ exercise_id: number; sets: number; reps: string; rpe: number; rest_seconds: number }> }>;
};

const initialState: PlanGroupActionState = {};

type MealSlot = { key: string; mealId: number; time: string };
type ExerciseSlot = { key: string; exerciseId: number; sets: number; reps: string; rpe: number; restSeconds: number };

function ActionMessage({ state }: { state: PlanGroupActionState }) {
  if (state.error) return <p className="form-message error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-message success" role="status">{state.success}</p>;
  return null;
}

/* ---------------------------------------------------------------- Diet groups */

function DietGroupComposer({ meals, existing, onSuccess }: { meals: MealOption[]; existing: DietGroupSummary | null; onSuccess: () => void }) {
  const t = useTranslations("Packages.groups");
  const tc = useTranslations("Common");
  const dayLabels = useDayLabels();
  const [state, action, pending] = useActionState(async (previous: PlanGroupActionState, formData: FormData) => {
    const result = await saveDietGroupAction(previous, formData);
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

  const filledDayCount = mealDays.filter((slots) => slots.length > 0).length;
  const activeMeals = mealDays[activeDay];

  return (
    <form action={action} className="builder-form">
      {existing ? <input type="hidden" name="id" value={existing.id} /> : null}
      <div className="form-grid">
        <label className="full"><span>{t("groupNameLabel")}</span><input name="name" placeholder={t("dietGroupNamePlaceholder")} defaultValue={existing?.name || ""} required /></label>
        <label className="full"><span>{t("descriptionLabel")}</span><textarea name="description" rows={2} defaultValue={existing?.description || ""} placeholder={t("descriptionPlaceholder")} /></label>
      </div>

      <div className="day-tab-row">
        {DAY_LABELS.map((_, dayIndex) => (
          <button
            type="button"
            key={DAY_LABELS[dayIndex]}
            className={`day-tab${dayIndex === activeDay ? " active" : ""}${mealDays[dayIndex].length ? " is-filled" : ""}`}
            onClick={() => setActiveDay(dayIndex)}
          >
            {dayLabels[dayIndex].slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="day-panel-section">
        <div className="composer-list-head"><div><strong>{dayLabels[activeDay]} {t("mealsSuffix")}</strong><span>{t("selectedCount", { count: activeMeals.length })}</span></div><button className="button secondary small" type="button" onClick={addMeal} disabled={meals.length === 0}><Plus size={14} /> {t("addMeal")}</button></div>
        {activeMeals.length === 0 ? <div className="builder-empty">{t("addAtLeastOneMeal", { day: dayLabels[activeDay] })}</div> : (
          <div className="data-table-wrap">
            <table className="data-table tier-editable-table">
              <thead><tr><th>{t("colMeal")}</th><th>{t("colTime")}</th><th>{t("colKcal")}</th><th></th></tr></thead>
              <tbody>
                {activeMeals.map((slot) => {
                  const meal = meals.find((item) => item.id === slot.mealId);
                  return (
                    <tr key={slot.key}>
                      <td><select value={slot.mealId} onChange={(event) => updateMeal(slot.key, { mealId: Number(event.target.value) })}>{meals.map((item) => <option key={item.id} value={item.id}>{item.meal_type} - {item.name}</option>)}</select></td>
                      <td><input type="time" value={slot.time} onChange={(event) => updateMeal(slot.key, { time: event.target.value })} /></td>
                      <td>{meal?.calories || "-"}</td>
                      <td><button type="button" className="icon-button" aria-label={t("removeMeal")} onClick={() => removeMeal(slot.key)}><Trash2 size={15} /></button></td>
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
        })).filter((day) => day.meals.length > 0))}
      />
      <ActionMessage state={state} />
      <div className="template-form-foot">
        <span className="days-progress">{t("daysBuiltProgress", { count: filledDayCount })}</span>
        <button className="button primary" type="submit" disabled={pending || filledDayCount === 0}>{pending ? tc("saving") : existing ? t("saveGroup") : t("createGroup")}</button>
      </div>
    </form>
  );
}

function DietGroupCard({ group, meals }: { group: DietGroupSummary; meals: MealOption[] }) {
  const t = useTranslations("Packages.groups");
  const tc = useTranslations("Common");
  const dayLabels = useDayLabels();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewDay, setViewDay] = useState(0);
  const [toggleState, toggleAction, togglePending] = useActionState(setDietGroupActiveAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: PlanGroupActionState, formData: FormData) => {
    const result = await deleteDietGroupAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);
  const totalMeals = group.days.reduce((sum, day) => sum + day.meals.length, 0);
  const activeViewDay = group.days[viewDay] || group.days[0];

  function openView() {
    setViewDay(0);
    setViewOpen(true);
  }

  return (
    <article
      className={`tier-package-card group-card-clickable${group.isActive ? "" : " is-archived"}`}
      role="button"
      tabIndex={0}
      onClick={openView}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openView(); } }}
      aria-label={t("viewDetailsAria", { name: group.name })}
    >
      <div className="tier-package-head">
        <span className="tier-badge">{t("dietGroupBadge")}</span>
        <Badge tone={group.isActive ? "success" : "neutral"}>{group.isActive ? t("activeBadge") : t("archivedBadge")}</Badge>
      </div>
      <h3>{group.name}</h3>
      <p>{group.description || t("daysMealsSummary", { days: group.days.length, meals: totalMeals })}</p>
      <div className="tier-package-stats">
        <div><strong>{group.days.length}</strong><span>{t("daysBuilt")}</span></div>
        <div><strong>{totalMeals}</strong><span>{t("meals")}</span></div>
      </div>
      <span className="group-card-hint"><Eye size={12} /> {t("tapToPreview")}</span>
      <div className="tier-package-actions" onClick={(event) => event.stopPropagation()}>
        <button className="button secondary" type="button" onClick={() => setEditOpen(true)}><Pencil size={14} /> {t("editGroup")}</button>
        <form action={toggleAction}>
          <input type="hidden" name="id" value={group.id} />
          <input type="hidden" name="is_active" value={group.isActive ? "false" : "true"} />
          <button className="button secondary" type="submit" disabled={togglePending}>{group.isActive ? <><Archive size={14} /> {t("archive")}</> : <><ArchiveRestore size={14} /> {t("restore")}</>}</button>
        </form>
        <button className="button secondary danger-action" type="button" onClick={() => setDeleting(true)} aria-label={t("deleteAria", { name: group.name })}><Trash2 size={14} /></button>
      </div>
      {toggleState.error ? <p className="form-message error" role="alert">{toggleState.error}</p> : null}

      {viewOpen ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onClick={(event) => event.stopPropagation()} onMouseDown={() => setViewOpen(false)}>
        <div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={t("viewDetailsAria", { name: group.name })} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setViewOpen(false)}><X size={18} /></button>
          <section className="builder-panel composer-panel">
            <header><span className="eyebrow">{t("dietGroupEyebrow")}</span><h2>{group.name}</h2><p>{group.description || t("detailsFallback")}</p></header>
            {group.days.length === 0 ? <div className="builder-empty">{t("noMealsBuilt")}</div> : (
              <>
                <div className="day-tab-row">
                  {group.days.map((day, index) => (
                    <button type="button" key={day.dayIndex} className={`day-tab is-filled${index === viewDay ? " active" : ""}`} onClick={() => setViewDay(index)}>
                      {dayLabels[day.dayIndex].slice(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="group-detail-meals">
                  {(activeViewDay?.meals || []).map((slot, slotIndex) => {
                    const meal = meals.find((item) => item.id === Number(slot.meal_id));
                    if (!meal) return null;
                    return (
                      <article className="meal-item-card" key={`${meal.id}-${slotIndex}`}>
                        <ExerciseMedia variant="thumb" context="meal" className="meal-thumb" url={meal.media_url} name={meal.name} />
                        <div className="meal-item-copy">
                          <span className="library-item-type">{meal.meal_type} · {slot.time}</span>
                          <h3>{meal.name}</h3>
                          <p>{meal.calories ? `${meal.calories} kcal` : t("caloriesNotSet")}{meal.protein_g ? ` · ${meal.protein_g}g protein` : ""}{meal.carbs_g ? ` · ${meal.carbs_g}g carbs` : ""}{meal.fat_g ? ` · ${meal.fat_g}g fat` : ""}</p>
                          {meal.ingredients ? <p className="group-detail-note">{meal.ingredients}</p> : null}
                          {meal.instructions ? <p className="group-detail-note is-muted">{meal.instructions}</p> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div></ModalPortal> : null}

      {editOpen ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onClick={(event) => event.stopPropagation()} onMouseDown={() => setEditOpen(false)}>
        <div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={group.name} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditOpen(false)}><X size={18} /></button>
          <section className="builder-panel composer-panel">
            <header><span className="eyebrow">{t("dietGroupEyebrow")}</span><h2>{group.name}</h2><p>{t("buildMealsHint")}</p></header>
            <DietGroupComposer meals={meals} existing={group} onSuccess={() => setEditOpen(false)} />
          </section>
        </div>
      </div></ModalPortal> : null}

      {deleting ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onClick={(event) => event.stopPropagation()} onMouseDown={() => setDeleting(false)}>
        <div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("deleteAria", { name: group.name })} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeleting(false)}><X size={18} /></button>
          <section className="builder-panel destructive-panel">
            <span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">{t("deleteDietGroupTitle")}</span><h2>{t("deleteConfirmTitle", { name: group.name })}</h2>
            <p>{t("deleteDietGroupBody")}</p>
            <form action={deleteAction}><input type="hidden" name="id" value={group.id} /><ActionMessage state={deleteState} /><div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? tc("deleting") : t("yesDeleteGroup")}</button></div></form>
          </section>
        </div>
      </div></ModalPortal> : null}
    </article>
  );
}

export function DietGroupsWorkspace({ meals, groups }: { meals: MealOption[]; groups: DietGroupSummary[] }) {
  const t = useTranslations("Packages.groups");
  const tc = useTranslations("Common");
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="plan-workspace-toolbar">
        <div><span className="workspace-icon"><Salad size={19} /></span><div><strong>{t("dietToolbarTitle")}</strong><span>{t("dietToolbarSubtitle", { count: groups.length })}</span></div></div>
        <button className="button primary" type="button" onClick={() => setCreating(true)} disabled={meals.length === 0}><Plus size={15} /> {t("createDietGroup")}</button>
      </div>

      {meals.length === 0 ? <Card className="empty-state"><Salad size={24} /><h3>{t("addMealsFirstTitle")}</h3><p>{t("addMealsFirstHint")}</p></Card> : groups.length === 0 ? (
        <Card className="empty-state"><Salad size={24} /><h3>{t("noDietGroupsTitle")}</h3><p>{t("noDietGroupsHint")}</p></Card>
      ) : (
        <div className="tier-package-grid group-card-grid">{groups.map((group) => <DietGroupCard key={group.id} group={group} meals={meals} />)}</div>
      )}

      {creating ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setCreating(false)}>
        <div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={t("createDietGroupTitle")} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setCreating(false)}><X size={18} /></button>
          <section className="builder-panel composer-panel">
            <header><span className="eyebrow">{t("newBundleEyebrow")}</span><h2>{t("createDietGroupTitle")}</h2><p>{t("createDietGroupHint")}</p></header>
            <DietGroupComposer meals={meals} existing={null} onSuccess={() => setCreating(false)} />
          </section>
        </div>
      </div></ModalPortal> : null}
    </>
  );
}

/* ------------------------------------------------------------- Workout groups */

function WorkoutGroupComposer({ exercises, existing, onSuccess }: { exercises: ExerciseOption[]; existing: WorkoutGroupSummary | null; onSuccess: () => void }) {
  const t = useTranslations("Packages.groups");
  const tc = useTranslations("Common");
  const dayLabels = useDayLabels();
  const [state, action, pending] = useActionState(async (previous: PlanGroupActionState, formData: FormData) => {
    const result = await saveWorkoutGroupAction(previous, formData);
    if (result.success) onSuccess();
    return result;
  }, initialState);
  const [activeDay, setActiveDay] = useState(0);
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

  const filledDayCount = exerciseDays.filter((slots) => slots.length > 0).length;
  const activeExercises = exerciseDays[activeDay];

  return (
    <form action={action} className="builder-form">
      {existing ? <input type="hidden" name="id" value={existing.id} /> : null}
      <div className="form-grid">
        <label className="full"><span>{t("groupNameLabel")}</span><input name="name" placeholder={t("workoutGroupNamePlaceholder")} defaultValue={existing?.name || ""} required /></label>
        <label className="full"><span>{t("descriptionLabel")}</span><textarea name="description" rows={2} defaultValue={existing?.description || ""} placeholder={t("descriptionPlaceholder")} /></label>
      </div>

      <div className="day-tab-row">
        {DAY_LABELS.map((_, dayIndex) => (
          <button
            type="button"
            key={DAY_LABELS[dayIndex]}
            className={`day-tab${dayIndex === activeDay ? " active" : ""}${exerciseDays[dayIndex].length ? " is-filled" : ""}`}
            onClick={() => setActiveDay(dayIndex)}
          >
            {dayLabels[dayIndex].slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="day-panel-section">
        <div className="composer-list-head"><div><strong>{dayLabels[activeDay]} {t("exercises")}</strong><span>{t("selectedCount", { count: activeExercises.length })}</span></div><button className="button secondary small" type="button" onClick={addExercise} disabled={exercises.length === 0}><Plus size={14} /> {t("addExercise")}</button></div>
        {activeExercises.length === 0 ? <div className="builder-empty">{t("addAtLeastOneExercise", { day: dayLabels[activeDay] })}</div> : (
          <div className="data-table-wrap">
            <table className="data-table tier-editable-table">
              <thead><tr><th></th><th>{t("colExercise")}</th><th>{t("colSets")}</th><th>{t("colReps")}</th><th>{t("colRpe")}</th><th>{t("colRestSec")}</th><th></th></tr></thead>
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
                      <td><button type="button" className="icon-button" aria-label={t("removeExercise")} onClick={() => removeExercise(selection.key)}><Trash2 size={15} /></button></td>
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
          exercises: exerciseDays[dayIndex].map(({ exerciseId, sets, reps, rpe, restSeconds }) => ({ exerciseId, sets, reps, rpe, restSeconds })),
        })).filter((day) => day.exercises.length > 0))}
      />
      <ActionMessage state={state} />
      <div className="template-form-foot">
        <span className="days-progress">{t("daysBuiltProgress", { count: filledDayCount })}</span>
        <button className="button primary" type="submit" disabled={pending || filledDayCount === 0}>{pending ? tc("saving") : existing ? t("saveGroup") : t("createGroup")}</button>
      </div>
    </form>
  );
}

function WorkoutGroupCard({ group, exercises }: { group: WorkoutGroupSummary; exercises: ExerciseOption[] }) {
  const t = useTranslations("Packages.groups");
  const tc = useTranslations("Common");
  const dayLabels = useDayLabels();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewDay, setViewDay] = useState(0);
  const [toggleState, toggleAction, togglePending] = useActionState(setWorkoutGroupActiveAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: PlanGroupActionState, formData: FormData) => {
    const result = await deleteWorkoutGroupAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);
  const totalExercises = group.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const activeViewDay = group.days[viewDay] || group.days[0];

  function openView() {
    setViewDay(0);
    setViewOpen(true);
  }

  return (
    <article
      className={`tier-package-card group-card-clickable${group.isActive ? "" : " is-archived"}`}
      role="button"
      tabIndex={0}
      onClick={openView}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openView(); } }}
      aria-label={t("viewDetailsAria", { name: group.name })}
    >
      <div className="tier-package-head">
        <span className="tier-badge">{t("workoutGroupBadge")}</span>
        <Badge tone={group.isActive ? "success" : "neutral"}>{group.isActive ? t("activeBadge") : t("archivedBadge")}</Badge>
      </div>
      <h3>{group.name}</h3>
      <p>{group.description || t("daysExercisesSummary", { days: group.days.length, exercises: totalExercises })}</p>
      <div className="tier-package-stats">
        <div><strong>{group.days.length}</strong><span>{t("daysBuilt")}</span></div>
        <div><strong>{totalExercises}</strong><span>{t("exercises")}</span></div>
      </div>
      <span className="group-card-hint"><Eye size={12} /> {t("tapToPreview")}</span>
      <div className="tier-package-actions" onClick={(event) => event.stopPropagation()}>
        <button className="button secondary" type="button" onClick={() => setEditOpen(true)}><Pencil size={14} /> {t("editGroup")}</button>
        <form action={toggleAction}>
          <input type="hidden" name="id" value={group.id} />
          <input type="hidden" name="is_active" value={group.isActive ? "false" : "true"} />
          <button className="button secondary" type="submit" disabled={togglePending}>{group.isActive ? <><Archive size={14} /> {t("archive")}</> : <><ArchiveRestore size={14} /> {t("restore")}</>}</button>
        </form>
        <button className="button secondary danger-action" type="button" onClick={() => setDeleting(true)} aria-label={t("deleteAria", { name: group.name })}><Trash2 size={14} /></button>
      </div>
      {toggleState.error ? <p className="form-message error" role="alert">{toggleState.error}</p> : null}

      {viewOpen ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onClick={(event) => event.stopPropagation()} onMouseDown={() => setViewOpen(false)}>
        <div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={t("viewDetailsAria", { name: group.name })} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setViewOpen(false)}><X size={18} /></button>
          <section className="builder-panel composer-panel">
            <header><span className="eyebrow">{t("workoutGroupEyebrow")}</span><h2>{group.name}</h2><p>{group.description || t("detailsFallback")}</p></header>
            {group.days.length === 0 ? <div className="builder-empty">{t("noExercisesBuilt")}</div> : (
              <>
                <div className="day-tab-row">
                  {group.days.map((day, index) => (
                    <button type="button" key={day.dayIndex} className={`day-tab is-filled${index === viewDay ? " active" : ""}`} onClick={() => setViewDay(index)}>
                      {dayLabels[day.dayIndex].slice(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="group-detail-exercises">
                  {(activeViewDay?.exercises || []).map((slot, slotIndex) => {
                    const exercise = exercises.find((item) => item.id === Number(slot.exercise_id));
                    if (!exercise) return null;
                    return (
                      <article className="exercise-tile" key={`${exercise.id}-${slotIndex}`}>
                        <div className="exercise-tile-media">
                          <ExerciseMedia variant="tile" url={exercise.media_url} name={exercise.name} muscleGroup={exercise.muscle_group} />
                          <span className="exercise-tile-badge">{exercise.muscle_group}</span>
                        </div>
                        <div className="exercise-tile-body">
                          <h3>{exercise.name}</h3>
                          <div className="exercise-tile-tags">
                            <span className="exercise-tag">{exercise.equipment}</span>
                            <span className={`exercise-tag diff-${exercise.difficulty}`}>{exercise.difficulty}</span>
                          </div>
                          <p className="group-detail-note">{slot.sets} sets × {slot.reps} reps · RPE {slot.rpe} · Rest {slot.rest_seconds}s</p>
                          {exercise.instructions ? <p className="group-detail-note is-muted">{exercise.instructions}</p> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div></ModalPortal> : null}

      {editOpen ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onClick={(event) => event.stopPropagation()} onMouseDown={() => setEditOpen(false)}>
        <div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={group.name} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditOpen(false)}><X size={18} /></button>
          <section className="builder-panel composer-panel">
            <header><span className="eyebrow">{t("workoutGroupEyebrow")}</span><h2>{group.name}</h2><p>{t("buildExercisesHint")}</p></header>
            <WorkoutGroupComposer exercises={exercises} existing={group} onSuccess={() => setEditOpen(false)} />
          </section>
        </div>
      </div></ModalPortal> : null}

      {deleting ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onClick={(event) => event.stopPropagation()} onMouseDown={() => setDeleting(false)}>
        <div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("deleteAria", { name: group.name })} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeleting(false)}><X size={18} /></button>
          <section className="builder-panel destructive-panel">
            <span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">{t("deleteWorkoutGroupTitle")}</span><h2>{t("deleteConfirmTitle", { name: group.name })}</h2>
            <p>{t("deleteWorkoutGroupBody")}</p>
            <form action={deleteAction}><input type="hidden" name="id" value={group.id} /><ActionMessage state={deleteState} /><div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? tc("deleting") : t("yesDeleteGroup")}</button></div></form>
          </section>
        </div>
      </div></ModalPortal> : null}
    </article>
  );
}

export function WorkoutGroupsWorkspace({ exercises, groups }: { exercises: ExerciseOption[]; groups: WorkoutGroupSummary[] }) {
  const t = useTranslations("Packages.groups");
  const tc = useTranslations("Common");
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="plan-workspace-toolbar">
        <div><span className="workspace-icon"><Dumbbell size={19} /></span><div><strong>{t("workoutToolbarTitle")}</strong><span>{t("workoutToolbarSubtitle", { count: groups.length })}</span></div></div>
        <button className="button primary" type="button" onClick={() => setCreating(true)} disabled={exercises.length === 0}><Plus size={15} /> {t("createWorkoutGroup")}</button>
      </div>

      {exercises.length === 0 ? <Card className="empty-state"><Dumbbell size={24} /><h3>{t("addExercisesFirstTitle")}</h3><p>{t("addExercisesFirstHint")}</p></Card> : groups.length === 0 ? (
        <Card className="empty-state"><Dumbbell size={24} /><h3>{t("noWorkoutGroupsTitle")}</h3><p>{t("noWorkoutGroupsHint")}</p></Card>
      ) : (
        <div className="tier-package-grid group-card-grid">{groups.map((group) => <WorkoutGroupCard key={group.id} group={group} exercises={exercises} />)}</div>
      )}

      {creating ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setCreating(false)}>
        <div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={t("createWorkoutGroupTitle")} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setCreating(false)}><X size={18} /></button>
          <section className="builder-panel composer-panel">
            <header><span className="eyebrow">{t("newBundleEyebrow")}</span><h2>{t("createWorkoutGroupTitle")}</h2><p>{t("createWorkoutGroupHint")}</p></header>
            <WorkoutGroupComposer exercises={exercises} existing={null} onSuccess={() => setCreating(false)} />
          </section>
        </div>
      </div></ModalPortal> : null}
    </>
  );
}
