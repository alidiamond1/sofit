"use client";

import { AlertTriangle, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  deleteDietPlanAction,
  deleteWorkoutPlanAction,
  updateDietPlanAction,
  updateWorkoutPlanAction,
  type PlanActionState,
} from "@/app/actions/plans";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { ExerciseMedia } from "./exercise-media";
import type { ExerciseOption, MealOption, PlanClient } from "./plan-builders";

type DietPlanRecord = {
  id: number;
  client_id: number;
  title: string;
  version: number;
  daily_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  starts_on: string;
  status: string;
  meals: unknown;
};

type WorkoutPlanRecord = {
  id: number;
  client_id: number;
  title: string;
  version: number;
  weeks: number;
  starts_on: string;
  status: string;
  exercises: unknown;
};

const initialState: PlanActionState = {};

function jsonArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ActionMessage({ state }: { state: PlanActionState }) {
  if (state.error) return <p className="form-message error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-message success" role="status">{state.success}</p>;
  return null;
}

function dietSelections(plan: DietPlanRecord, meals: MealOption[]) {
  return jsonArray(plan.meals).flatMap((item, index) => {
    const mealId = Number(item.meal_id || meals.find((meal) => meal.name === item.name)?.id);
    if (!mealId || !meals.some((meal) => meal.id === mealId)) return [];
    return [{ key: `meal-${plan.id}-${index}-${mealId}`, mealId, time: String(item.time || "08:00") }];
  });
}

function workoutSelections(plan: WorkoutPlanRecord, exercises: ExerciseOption[]) {
  return jsonArray(plan.exercises).flatMap((item, index) => {
    const exerciseId = Number(item.exercise_id || exercises.find((exercise) => exercise.name === item.exercise)?.id);
    if (!exerciseId || !exercises.some((exercise) => exercise.id === exerciseId)) return [];
    return [{
      key: `exercise-${plan.id}-${index}-${exerciseId}`,
      exerciseId,
      day: String(item.day || "Day 1"),
      sets: Number(item.sets || 3),
      reps: String(item.reps || "8-12"),
      rpe: Number(item.rpe || 7),
      restSeconds: Number(item.rest_seconds || 90),
    }];
  });
}

export function DietPlanRecordActions({
  plan,
  clients,
  meals,
}: {
  plan: DietPlanRecord;
  clients: PlanClient[];
  meals: MealOption[];
}) {
  const t = useTranslations("Packages.recordActions");
  const tc = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState(() => dietSelections(plan, meals));
  const [editState, editAction, editPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await updateDietPlanAction(previous, formData);
    if (result.success) setEditing(false);
    return result;
  }, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await deleteDietPlanAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);

  function openEditor() {
    setSelectedMeals(dietSelections(plan, meals));
    setEditing(true);
  }

  function addMeal() {
    if (!meals[0]) return;
    setSelectedMeals((current) => [...current, { key: `meal-${plan.id}-${Date.now()}`, mealId: meals[0].id, time: "08:00" }]);
  }

  return (
    <>
      <div className="record-actions table-record-actions">
        <button className="mini-action" type="button" title={tc("edit")} aria-label={t("editPlanAria", { title: plan.title })} onClick={openEditor}><Pencil size={13} /></button>
        <button className="mini-action danger-action" type="button" title={tc("delete")} aria-label={t("deletePlanAria", { title: plan.title })} onClick={() => setDeleting(true)}><Trash2 size={13} /></button>
      </div>
      {editing ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={t("editPlanAria", { title: plan.title })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditing(false)}><X size={18} /></button><section className="builder-panel composer-panel">
        <header><span className="eyebrow">{t("editDietPlanEyebrow")}</span><h2>{plan.title}</h2><p>{t("editDietPlanHint")}</p></header>
        <form action={editAction} className="builder-form">
          <input type="hidden" name="id" value={plan.id} />
          <div className="form-grid">
            <label><span>{t("client")}</span><select name="client_id" defaultValue={plan.client_id} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label><span>{t("planTitle")}</span><input name="title" defaultValue={plan.title} required /></label>
            <label><span>{t("dailyCalories")}</span><input name="daily_calories" type="number" min="0" defaultValue={plan.daily_calories ?? 0} required /></label>
            <label><span>{t("proteinG")}</span><input name="protein_g" type="number" min="0" defaultValue={plan.protein_g ?? ""} /></label>
            <label><span>{t("carbsG")}</span><input name="carbs_g" type="number" min="0" defaultValue={plan.carbs_g ?? ""} /></label>
            <label><span>{t("fatG")}</span><input name="fat_g" type="number" min="0" defaultValue={plan.fat_g ?? ""} /></label>
            <label><span>{t("startsOn")}</span><input name="starts_on" type="date" defaultValue={plan.starts_on} required /></label>
            <label><span>{t("status")}</span><select name="status" defaultValue={plan.status === "active" ? "active" : "draft"}><option value="active">{t("activePlan")}</option><option value="draft">{t("draft")}</option></select></label>
          </div>
          <div className="composer-list-head"><div><strong>{t("dailyMeals")}</strong><span>{t("selectedCount", { count: selectedMeals.length })}</span></div><button className="button secondary small" type="button" onClick={addMeal} disabled={meals.length === 0}><Plus size={14} /> {t("addMeal")}</button></div>
          <div className="composer-rows">
            {selectedMeals.map((selection, index) => <div className="composer-row meal-row" key={selection.key}><span className="row-number">{index + 1}</span><label><span>{t("meal")}</span><select value={selection.mealId} onChange={(event) => setSelectedMeals((current) => current.map((item) => item.key === selection.key ? { ...item, mealId: Number(event.target.value) } : item))}>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.meal_type} - {meal.name}</option>)}</select></label><label><span>{t("time")}</span><input type="time" value={selection.time} onChange={(event) => setSelectedMeals((current) => current.map((item) => item.key === selection.key ? { ...item, time: event.target.value } : item))} /></label><div className="row-preview"><strong>{meals.find((meal) => meal.id === selection.mealId)?.calories || "-"}</strong><span>kcal</span></div><button className="icon-button" type="button" aria-label={t("removeMeal")} onClick={() => setSelectedMeals((current) => current.filter((item) => item.key !== selection.key))}><Trash2 size={15} /></button></div>)}
            {selectedMeals.length === 0 ? <div className="builder-empty">{t("emptyMealsHint")}</div> : null}
          </div>
          <input type="hidden" name="meals_json" value={JSON.stringify(selectedMeals.map(({ mealId, time }) => ({ mealId, time })))} />
          <ActionMessage state={editState} />
          <button className="button primary" type="submit" disabled={editPending || selectedMeals.length === 0}>{editPending ? tc("saving") : t("saveDietPlan")}</button>
        </form>
      </section></div></div></ModalPortal> : null}
      {deleting ? <DeletePlanModal kind={t("deleteDietPlanKind")} title={plan.title} id={plan.id} state={deleteState} action={deleteAction} pending={deletePending} onClose={() => setDeleting(false)} /> : null}
    </>
  );
}

export function WorkoutPlanRecordActions({
  plan,
  clients,
  exercises,
}: {
  plan: WorkoutPlanRecord;
  clients: PlanClient[];
  exercises: ExerciseOption[];
}) {
  const t = useTranslations("Packages.recordActions");
  const tc = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState(() => workoutSelections(plan, exercises));
  const [editState, editAction, editPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await updateWorkoutPlanAction(previous, formData);
    if (result.success) setEditing(false);
    return result;
  }, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await deleteWorkoutPlanAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);

  function openEditor() {
    setSelectedExercises(workoutSelections(plan, exercises));
    setEditing(true);
  }

  function addExercise() {
    if (!exercises[0]) return;
    setSelectedExercises((current) => [...current, { key: `exercise-${plan.id}-${Date.now()}`, exerciseId: exercises[0].id, day: "Day 1", sets: 3, reps: "8-12", rpe: 7, restSeconds: 90 }]);
  }

  function updateSelection(key: string, values: Partial<(typeof selectedExercises)[number]>) {
    setSelectedExercises((current) => current.map((item) => item.key === key ? { ...item, ...values } : item));
  }

  return (
    <>
      <div className="record-actions table-record-actions">
        <button className="mini-action" type="button" title={tc("edit")} aria-label={t("editPlanAria", { title: plan.title })} onClick={openEditor}><Pencil size={13} /></button>
        <button className="mini-action danger-action" type="button" title={tc("delete")} aria-label={t("deletePlanAria", { title: plan.title })} onClick={() => setDeleting(true)}><Trash2 size={13} /></button>
      </div>
      {editing ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}><div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={t("editPlanAria", { title: plan.title })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditing(false)}><X size={18} /></button><section className="builder-panel composer-panel">
        <header><span className="eyebrow">{t("editWorkoutPlanEyebrow")}</span><h2>{plan.title}</h2><p>{t("editWorkoutPlanHint")}</p></header>
        <form action={editAction} className="builder-form">
          <input type="hidden" name="id" value={plan.id} />
          <div className="form-grid">
            <label><span>{t("client")}</span><select name="client_id" defaultValue={plan.client_id} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label><span>{t("programTitle")}</span><input name="title" defaultValue={plan.title} required /></label>
            <label><span>{t("programLength")}</span><input name="weeks" type="number" min="1" max="52" defaultValue={plan.weeks} required /></label>
            <label><span>{t("startsOn")}</span><input name="starts_on" type="date" defaultValue={plan.starts_on} required /></label>
            <label><span>{t("status")}</span><select name="status" defaultValue={plan.status === "active" ? "active" : "draft"}><option value="active">{t("activeProgram")}</option><option value="draft">{t("draft")}</option></select></label>
          </div>
          <div className="composer-list-head"><div><strong>{t("programExercises")}</strong><span>{t("movementsCount", { count: selectedExercises.length })}</span></div><button className="button secondary small" type="button" onClick={addExercise} disabled={exercises.length === 0}><Plus size={14} /> {t("addExercise")}</button></div>
          <div className="composer-rows workout-composer-rows">
            {selectedExercises.map((selection, index) => {
              const exercise = exercises.find((item) => item.id === selection.exerciseId) || exercises[0];
              return <div className="composer-row workout-row" key={selection.key}><span className="row-number">{index + 1}</span>{exercise ? <ExerciseMedia variant="thumb" className="composer-thumb" url={exercise.media_url} name={exercise.name} muscleGroup={exercise.muscle_group} /> : null}<label className="exercise-select"><span>{t("exercise")}</span><select value={selection.exerciseId} onChange={(event) => updateSelection(selection.key, { exerciseId: Number(event.target.value) })}>{exercises.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.muscle_group}</option>)}</select></label><label><span>{t("day")}</span><input value={selection.day} onChange={(event) => updateSelection(selection.key, { day: event.target.value })} /></label><label><span>{t("sets")}</span><input type="number" min="1" max="20" value={selection.sets} onChange={(event) => updateSelection(selection.key, { sets: Number(event.target.value) })} /></label><label><span>{t("reps")}</span><input value={selection.reps} onChange={(event) => updateSelection(selection.key, { reps: event.target.value })} /></label><label><span>{t("rpe")}</span><input type="number" min="1" max="10" step=".5" value={selection.rpe} onChange={(event) => updateSelection(selection.key, { rpe: Number(event.target.value) })} /></label><label><span>{t("restSec")}</span><input type="number" min="0" max="1200" value={selection.restSeconds} onChange={(event) => updateSelection(selection.key, { restSeconds: Number(event.target.value) })} /></label><button className="icon-button" type="button" aria-label={t("removeExercise")} onClick={() => setSelectedExercises((current) => current.filter((item) => item.key !== selection.key))}><Trash2 size={15} /></button></div>;
            })}
            {selectedExercises.length === 0 ? <div className="builder-empty">{t("emptyExercisesHint")}</div> : null}
          </div>
          <input type="hidden" name="exercises_json" value={JSON.stringify(selectedExercises.map(({ exerciseId, day, sets, reps, rpe, restSeconds }) => ({ exerciseId, day, sets, reps, rpe, restSeconds })))} />
          <ActionMessage state={editState} />
          <button className="button primary" type="submit" disabled={editPending || selectedExercises.length === 0}>{editPending ? tc("saving") : t("saveWorkoutPlan")}</button>
        </form>
      </section></div></div></ModalPortal> : null}
      {deleting ? <DeletePlanModal kind={t("deleteWorkoutPlanKind")} title={plan.title} id={plan.id} state={deleteState} action={deleteAction} pending={deletePending} onClose={() => setDeleting(false)} /> : null}
    </>
  );
}

function DeletePlanModal({
  kind,
  title,
  id,
  state,
  action,
  pending,
  onClose,
}: {
  kind: string;
  title: string;
  id: number;
  state: PlanActionState;
  action: (formData: FormData) => void;
  pending: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Packages.recordActions");
  const tc = useTranslations("Common");
  return <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={onClose}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("deletePlanAria", { title })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={onClose}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">{t("deleteEyebrow", { kind })}</span><h2>{t("deleteTitle", { title })}</h2><p>{t("deleteBody", { kind })}</p><form action={action}><input type="hidden" name="id" value={id} /><ActionMessage state={state} /><div className="confirm-actions"><button className="button secondary" type="button" onClick={onClose}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={pending}>{pending ? tc("deleting") : t("deleteButton", { kind })}</button></div></form></section></div></div></ModalPortal>;
}
