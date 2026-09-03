"use client";

import { AlertTriangle, Check, ChevronDown, Dumbbell, Library, Pencil, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  addStarterExercisesAction,
  createDietPlanAction,
  createExerciseAction,
  createMealTemplateAction,
  createWorkoutPlanAction,
  deleteExerciseAction,
  deleteMealTemplateAction,
  updateExerciseAction,
  updateMealTemplateAction,
  type PlanActionState,
} from "@/app/actions/plans";
import { type ExerciseMotionType } from "./exercise-motion";
import { ExerciseMedia, MediaUploader } from "./exercise-media";
import { STARTER_EXERCISES } from "@/lib/workout/starter-exercises";
import { difficultyLabel } from "@/lib/status-labels";

export type PlanClient = { id: number; name: string; email: string };
export type MealOption = {
  id: number;
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  ingredients: string;
  instructions: string | null;
  media_url: string | null;
};
export type ExerciseOption = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  motion_type: ExerciseMotionType;
  media_url: string | null;
  instructions: string | null;
};

const initialState: PlanActionState = {};

function ActionMessage({ state }: { state: PlanActionState }) {
  if (state.error) return <p className="form-message error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-message success" role="status">{state.success}</p>;
  return null;
}

export function DietPlanBuilder({ clients, meals, defaultDate }: { clients: PlanClient[]; meals: MealOption[]; defaultDate: string }) {
  const t = useTranslations("Packages.mealLibrary");
  const tf = useTranslations("Packages.dietPlanForm");
  const tc = useTranslations("Common");
  const [mealModal, setMealModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealOption | null>(null);
  const [deletingMeal, setDeletingMeal] = useState<MealOption | null>(null);
  const [mealState, mealAction, mealPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await createMealTemplateAction(previous, formData);
    if (result.success) setMealModal(false);
    return result;
  }, initialState);
  const [planState, planAction, planPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await createDietPlanAction(previous, formData);
    if (result.success) setPlanModal(false);
    return result;
  }, initialState);
  const [editMealState, editMealAction, editMealPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await updateMealTemplateAction(previous, formData);
    if (result.success) setEditingMeal(null);
    return result;
  }, initialState);
  const [deleteMealState, deleteMealAction, deleteMealPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await deleteMealTemplateAction(previous, formData);
    if (result.success) setDeletingMeal(null);
    return result;
  }, initialState);
  const [selectedMeals, setSelectedMeals] = useState<Array<{ key: string; mealId: number; time: string }>>([]);
  const mealGroups = [
    { type: "breakfast", label: t("breakfast") },
    { type: "lunch", label: t("lunch") },
    { type: "dinner", label: t("dinner") },
    { type: "snack", label: t("snacks") },
  ] as const;

  function addMeal() {
    if (!meals[0]) return;
    setSelectedMeals((current) => [...current, { key: `meal-${current.length}-${meals[0].id}`, mealId: meals[0].id, time: "08:00" }]);
  }

  return (
    <>
      <div className="plan-workspace-toolbar">
        <div><span className="workspace-icon"><Utensils size={19} /></span><div><strong>{t("toolbarTitle")}</strong><span>{t("toolbarSubtitle", { count: meals.length })}</span></div></div>
        <div><button className="button secondary" type="button" onClick={() => setMealModal(true)}><Plus size={15} /> {t("addMeal")}</button><button className="button primary" type="button" onClick={() => setPlanModal(true)} disabled={meals.length === 0}><Plus size={15} /> {t("createDietPlan")}</button></div>
      </div>
      <div className="typed-library-grid meal-library-grid">
        {mealGroups.map((group) => {
          const groupMeals = meals.filter((meal) => meal.meal_type === group.type);
          return <section className="typed-library-column" key={group.type}><header><span>{group.label}</span><strong>{groupMeals.length}</strong></header><div>{groupMeals.map((meal) => <article className="meal-item-card" key={meal.id}><ExerciseMedia variant="thumb" context="meal" className="meal-thumb" url={meal.media_url} name={meal.name} /><div className="meal-item-copy"><span className="library-item-type">{meal.meal_type}</span><h3>{meal.name}</h3><p>{meal.calories ? `${meal.calories} kcal` : t("caloriesNotSet")}</p></div><div className="record-actions"><button className="mini-action" type="button" title={t("editMealEyebrow")} aria-label={t("editMealAria", { name: meal.name })} onClick={() => setEditingMeal(meal)}><Pencil size={13} /></button><button className="mini-action danger-action" type="button" title={t("deleteMealEyebrow")} aria-label={t("deleteMealAria", { name: meal.name })} onClick={() => setDeletingMeal(meal)}><Trash2 size={13} /></button></div></article>)}{groupMeals.length === 0 ? <div className="library-column-empty">{t("noMealsOfType", { type: group.label })}</div> : null}</div></section>;
        })}
      </div>

      {editingMeal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditingMeal(null)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label={t("editMealAria", { name: editingMeal.name })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditingMeal(null)}><X size={18} /></button>
      <section className="builder-panel library-panel">
        <header><span className="eyebrow">{t("editMealEyebrow")}</span><h2>{editingMeal.name}</h2><p>{t("editMealHint")}</p></header>
        <form action={editMealAction} className="builder-form">
          <input type="hidden" name="id" value={editingMeal.id} />
          <MediaUploader context="meal" defaultUrl={editingMeal.media_url} name={editingMeal.name} />
          <div className="form-grid">
            <label><span>{t("mealName")}</span><input name="name" defaultValue={editingMeal.name} required /></label>
            <label><span>{t("mealType")}</span><select name="meal_type" defaultValue={editingMeal.meal_type}><option value="breakfast">{t("breakfast")}</option><option value="lunch">{t("lunch")}</option><option value="dinner">{t("dinner")}</option><option value="snack">{t("snack")}</option></select></label>
            <label><span>{t("calories")}</span><input name="calories" type="number" min="0" defaultValue={editingMeal.calories ?? ""} /></label>
            <label><span>{t("proteinG")}</span><input name="protein_g" type="number" min="0" defaultValue={editingMeal.protein_g ?? ""} /></label>
            <label><span>{t("carbsG")}</span><input name="carbs_g" type="number" min="0" defaultValue={editingMeal.carbs_g ?? ""} /></label>
            <label><span>{t("fatG")}</span><input name="fat_g" type="number" min="0" defaultValue={editingMeal.fat_g ?? ""} /></label>
            <label className="full"><span>{t("ingredients")}</span><textarea name="ingredients" rows={4} defaultValue={editingMeal.ingredients} required /></label>
            <label className="full"><span>{t("instructions")}</span><textarea name="instructions" rows={3} defaultValue={editingMeal.instructions || ""} /></label>
          </div>
          <ActionMessage state={editMealState} />
          <button className="button primary" type="submit" disabled={editMealPending}>{editMealPending ? tc("saving") : t("saveMealChanges")}</button>
        </form>
      </section>
      </div></div> : null}

      {deletingMeal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeletingMeal(null)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("deleteMealAria", { name: deletingMeal.name })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeletingMeal(null)}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">{t("deleteMealEyebrow")}</span><h2>{t("deleteMealTitle", { name: deletingMeal.name })}</h2><p>{t("deleteMealBody")}</p><form action={deleteMealAction}><input type="hidden" name="id" value={deletingMeal.id} /><ActionMessage state={deleteMealState} /><div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeletingMeal(null)}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={deleteMealPending}>{deleteMealPending ? tc("deleting") : t("deleteMealButton")}</button></div></form></section></div></div> : null}

      {mealModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setMealModal(false)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label={t("addMealTitle")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setMealModal(false)}><X size={18} /></button>
      <section className="builder-panel library-panel">
        <header><span className="eyebrow">{t("addMealEyebrow")}</span><h2>{t("addMealTitle")}</h2><p>{t("addMealHint")}</p></header>
        <form action={mealAction} className="builder-form">
          <MediaUploader context="meal" name="New meal" />
          <div className="form-grid">
            <label><span>{t("mealName")}</span><input name="name" placeholder={t("mealNamePlaceholder")} required /></label>
            <label><span>{t("mealType")}</span><select name="meal_type" defaultValue="breakfast"><option value="breakfast">{t("breakfast")}</option><option value="lunch">{t("lunch")}</option><option value="dinner">{t("dinner")}</option><option value="snack">{t("snack")}</option></select></label>
            <label><span>{t("calories")}</span><input name="calories" type="number" min="0" /></label>
            <label><span>{t("proteinG")}</span><input name="protein_g" type="number" min="0" /></label>
            <label><span>{t("carbsG")}</span><input name="carbs_g" type="number" min="0" /></label>
            <label><span>{t("fatG")}</span><input name="fat_g" type="number" min="0" /></label>
            <label className="full"><span>{t("ingredients")}</span><textarea name="ingredients" rows={4} placeholder={t("ingredientsPlaceholder")} required /></label>
            <label className="full"><span>{t("instructions")}</span><textarea name="instructions" rows={3} placeholder={t("instructionsPlaceholder")} /></label>
          </div>
          <ActionMessage state={mealState} />
          <button className="button secondary" type="submit" disabled={mealPending}>{mealPending ? tc("saving") : t("saveMealToLibrary")}</button>
        </form>
      </section>
      </div></div> : null}

      {planModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setPlanModal(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={tf("title")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setPlanModal(false)}><X size={18} /></button>
      <section className="builder-panel composer-panel">
        <header><span className="eyebrow">{tf("eyebrow")}</span><h2>{tf("title")}</h2><p>{tf("hint")}</p></header>
        <form action={planAction} className="builder-form">
          <div className="form-grid">
            <label><span>{tf("client")}</span><select name="client_id" defaultValue="" required><option value="" disabled>{tf("selectClient")}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label><span>{tf("planTitle")}</span><input name="title" placeholder={tf("planTitlePlaceholder")} required /></label>
            <label><span>{tf("dailyCalories")}</span><input name="daily_calories" type="number" min="0" required /></label>
            <label><span>{tf("proteinG")}</span><input name="protein_g" type="number" min="0" /></label>
            <label><span>{tf("carbsG")}</span><input name="carbs_g" type="number" min="0" /></label>
            <label><span>{tf("fatG")}</span><input name="fat_g" type="number" min="0" /></label>
            <label><span>{tf("startsOn")}</span><input name="starts_on" type="date" defaultValue={defaultDate} required /></label>
            <label><span>{tf("saveAs")}</span><select name="status" defaultValue="active"><option value="active">{tf("activePlan")}</option><option value="draft">{tf("draft")}</option></select></label>
          </div>

          <div className="composer-list-head"><div><strong>{tf("dailyMeals")}</strong><span>{tf("selectedCount", { count: selectedMeals.length })}</span></div><button className="button secondary small" type="button" onClick={addMeal} disabled={meals.length === 0}><Plus size={14} /> {tf("addMeal")}</button></div>
          <div className="composer-rows">
            {selectedMeals.map((selection, index) => {
              const meal = meals.find((item) => item.id === selection.mealId);
              return (
                <div className="composer-row meal-row" key={selection.key}>
                  <span className="row-number">{index + 1}</span>
                  <label><span>{tf("meal")}</span><select value={selection.mealId} onChange={(event) => setSelectedMeals((current) => current.map((item) => item.key === selection.key ? { ...item, mealId: Number(event.target.value) } : item))}>{meals.map((item) => <option key={item.id} value={item.id}>{item.meal_type} - {item.name}</option>)}</select></label>
                  <label><span>{tf("time")}</span><input type="time" value={selection.time} onChange={(event) => setSelectedMeals((current) => current.map((item) => item.key === selection.key ? { ...item, time: event.target.value } : item))} /></label>
                  <div className="row-preview"><strong>{meal?.calories || "-"}</strong><span>{tf("kcal")}</span></div>
                  <button type="button" className="icon-button" aria-label={tf("removeMeal")} onClick={() => setSelectedMeals((current) => current.filter((item) => item.key !== selection.key))}><Trash2 size={15} /></button>
                </div>
              );
            })}
            {selectedMeals.length === 0 ? <div className="builder-empty">{tf("emptyMealsHint")}</div> : null}
          </div>
          <input type="hidden" name="meals_json" value={JSON.stringify(selectedMeals.map(({ mealId, time }) => ({ mealId, time })))} />
          <ActionMessage state={planState} />
          <button className="button primary" type="submit" disabled={planPending || selectedMeals.length === 0}>{planPending ? tc("assigning") : tf("createAndAssign")}</button>
        </form>
      </section>
      </div></div> : null}
    </>
  );
}

export function WorkoutPlanBuilder({ clients, exercises, defaultDate }: { clients: PlanClient[]; exercises: ExerciseOption[]; defaultDate: string }) {
  const t = useTranslations("Packages.exerciseLibrary");
  const tf = useTranslations("Packages.workoutPlanForm");
  const ts = useTranslations("Packages.starterLibrary");
  const tc = useTranslations("Common");
  const [exerciseModal, setExerciseModal] = useState(false);
  const [programModal, setProgramModal] = useState(false);
  const [starterModal, setStarterModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseOption | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<ExerciseOption | null>(null);
  const [viewingExercise, setViewingExercise] = useState<ExerciseOption | null>(null);
  const [exerciseState, exerciseAction, exercisePending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await createExerciseAction(previous, formData);
    if (result.success) setExerciseModal(false);
    return result;
  }, initialState);
  const [planState, planAction, planPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await createWorkoutPlanAction(previous, formData);
    if (result.success) setProgramModal(false);
    return result;
  }, initialState);
  const [editExerciseState, editExerciseAction, editExercisePending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await updateExerciseAction(previous, formData);
    if (result.success) setEditingExercise(null);
    return result;
  }, initialState);
  const [deleteExerciseState, deleteExerciseFormAction, deleteExercisePending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    const result = await deleteExerciseAction(previous, formData);
    if (result.success) setDeletingExercise(null);
    return result;
  }, initialState);
  const [starterState, starterAction, starterPending] = useActionState(async (previous: PlanActionState, formData: FormData) => {
    return addStarterExercisesAction(previous, formData);
  }, initialState);
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedExercises, setSelectedExercises] = useState<Array<{ key: string; exerciseId: number; day: string; sets: number; reps: string; rpe: number; restSeconds: number }>>([]);

  function toggleGroup(group: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  function renderExerciseCard(exercise: ExerciseOption) {
    return (
      <article
        className="exercise-tile is-clickable"
        key={exercise.id}
        role="button"
        tabIndex={0}
        onClick={() => setViewingExercise(exercise)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setViewingExercise(exercise); } }}
      >
        <div className="exercise-tile-media">
          <div className="exercise-tile-actions record-actions" onClick={(event) => event.stopPropagation()}>
            <button className="mini-action" type="button" title={t("editExerciseEyebrow")} aria-label={t("editExerciseAria", { name: exercise.name })} onClick={() => setEditingExercise(exercise)}><Pencil size={13} /></button>
            <button className="mini-action danger-action" type="button" title={t("deleteExerciseEyebrow")} aria-label={t("deleteExerciseAria", { name: exercise.name })} onClick={() => setDeletingExercise(exercise)}><Trash2 size={13} /></button>
          </div>
          <ExerciseMedia variant="tile" url={exercise.media_url} name={exercise.name} muscleGroup={exercise.muscle_group} />
          <span className="exercise-tile-badge">{exercise.muscle_group}</span>
        </div>
        <div className="exercise-tile-body">
          <h3>{exercise.name}</h3>
          <div className="exercise-tile-tags">
            <span className="exercise-tag">{exercise.equipment}</span>
            <span className={`exercise-tag diff-${exercise.difficulty}`}>{difficultyLabel(t, exercise.difficulty)}</span>
          </div>
        </div>
      </article>
    );
  }

  function addExercise() {
    if (!exercises[0]) return;
    setSelectedExercises((current) => [...current, { key: `exercise-${current.length}-${exercises[0].id}`, exerciseId: exercises[0].id, day: "Day 1", sets: 3, reps: "8-12", rpe: 7, restSeconds: 90 }]);
  }

  function updateExercise(key: string, values: Partial<(typeof selectedExercises)[number]>) {
    setSelectedExercises((current) => current.map((item) => item.key === key ? { ...item, ...values } : item));
  }

  const existingExerciseNames = new Set(exercises.map((exercise) => exercise.name.toLowerCase()));
  const muscleGroups = ["all", ...Array.from(new Set(exercises.map((exercise) => exercise.muscle_group))).sort((a, b) => a.localeCompare(b))];
  const isSearching = query.trim() !== "";
  const filteredExercises = exercises.filter((exercise) => {
    const matchesMuscle = muscleFilter === "all" || exercise.muscle_group === muscleFilter;
    const haystack = `${exercise.name} ${exercise.muscle_group} ${exercise.equipment}`.toLowerCase();
    return matchesMuscle && (!isSearching || haystack.includes(query.trim().toLowerCase()));
  });
  // Grouped, collapsible sections only make sense for the unfiltered "All" view —
  // a flat wall of 300+ cards was the exact "endless scroll" complaint. A single
  // chip or an active search already narrows things down, so keep those flat.
  const groupedExercises = muscleFilter === "all" && !isSearching
    ? Array.from(
        filteredExercises.reduce((map, exercise) => {
          const list = map.get(exercise.muscle_group) || [];
          list.push(exercise);
          map.set(exercise.muscle_group, list);
          return map;
        }, new Map<string, ExerciseOption[]>()),
      ).sort(([a], [b]) => a.localeCompare(b))
    : null;

  return (
    <>
      <div className="plan-workspace-toolbar">
        <div><span className="workspace-icon"><Dumbbell size={19} /></span><div><strong>{t("toolbarTitle")}</strong><span>{t("toolbarSubtitle", { count: exercises.length })}</span></div></div>
        <div><button className="button secondary" type="button" onClick={() => setStarterModal(true)}><Library size={15} /> {t("starterLibraryButton")}</button><button className="button secondary" type="button" onClick={() => setExerciseModal(true)}><Plus size={15} /> {t("addExercise")}</button><button className="button primary" type="button" onClick={() => setProgramModal(true)} disabled={exercises.length === 0}><Plus size={15} /> {t("createWorkoutPlan")}</button></div>
      </div>
      {exercises.length > 0 ? (
        <div className="exercise-filter-bar">
          <label className="exercise-search"><Search size={16} /><input placeholder={t("searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("searchAria")} /></label>
          <div className="exercise-chip-row">
            {muscleGroups.map((group) => <button type="button" key={group} className={muscleFilter === group ? "exercise-chip active" : "exercise-chip"} onClick={() => setMuscleFilter(group)}>{group === "all" ? t("all") : group}</button>)}
          </div>
        </div>
      ) : null}
      <div className="exercise-gallery">
        {groupedExercises ? (
          groupedExercises.map(([group, items]) => {
            const isOpen = expandedGroups.has(group);
            return (
              <section className={`exercise-group${isOpen ? " is-open" : ""}`} key={group}>
                <button type="button" className="exercise-group-head" onClick={() => toggleGroup(group)} aria-expanded={isOpen}>
                  <span className="exercise-group-name">{group}</span>
                  <span className="exercise-group-count">{items.length}</span>
                  <ChevronDown size={16} className="exercise-group-chevron" />
                </button>
                {isOpen ? <div className="exercise-group-grid">{items.map((exercise) => renderExerciseCard(exercise))}</div> : null}
              </section>
            );
          })
        ) : (
          filteredExercises.map((exercise) => renderExerciseCard(exercise))
        )}
        {exercises.length === 0 ? (
          <div className="exercise-gallery-empty"><span className="media-empty-icon"><Dumbbell size={24} /></span><strong>{t("noExercisesTitle")}</strong><span>{t("noExercisesHint", { count: STARTER_EXERCISES.length })}</span><button className="button primary" type="button" onClick={() => setStarterModal(true)}><Library size={15} /> {t("browseStarterLibrary")}</button></div>
        ) : filteredExercises.length === 0 ? (
          <div className="exercise-gallery-empty"><span className="media-empty-icon"><Search size={22} /></span><strong>{t("noMatchesTitle")}</strong><span>{t("noMatchesHint")}</span></div>
        ) : null}
      </div>

      {viewingExercise ? (
        <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setViewingExercise(null)}>
          <div className="plan-modal detail-modal" role="dialog" aria-modal="true" aria-label={viewingExercise.name} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setViewingExercise(null)}><X size={18} /></button>
            <div className="detail-panel">
              <ExerciseMedia variant="hero" url={viewingExercise.media_url} name={viewingExercise.name} muscleGroup={viewingExercise.muscle_group} />
              <div className="detail-head">
                <span className="eyebrow">{viewingExercise.muscle_group}</span>
                <h2>{viewingExercise.name}</h2>
                <div className="detail-tags">
                  <span className="exercise-tag">{viewingExercise.equipment}</span>
                  <span className={`exercise-tag diff-${viewingExercise.difficulty}`}>{difficultyLabel(t, viewingExercise.difficulty)}</span>
                </div>
              </div>
              <div className="detail-instructions">
                <h4>{t("howToPerform")}</h4>
                <p>{viewingExercise.instructions || t("noCoachingCues")}</p>
              </div>
              <div className="detail-actions">
                <button className="button secondary" type="button" onClick={() => { setEditingExercise(viewingExercise); setViewingExercise(null); }}><Pencil size={14} /> {t("editExerciseButton")}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingExercise ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditingExercise(null)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label={t("editExerciseAria", { name: editingExercise.name })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditingExercise(null)}><X size={18} /></button>
      <section className="builder-panel library-panel exercise-library-panel">
        <header><span className="eyebrow">{t("editExerciseEyebrow")}</span><h2>{editingExercise.name}</h2><p>{t("editExerciseHint")}</p></header>
        <form action={editExerciseAction} className="builder-form">
          <input type="hidden" name="id" value={editingExercise.id} />
          <MediaUploader defaultUrl={editingExercise.media_url} name={editingExercise.name} muscleGroup={editingExercise.muscle_group} />
          <div className="form-grid">
            <label><span>{t("exerciseName")}</span><input name="name" defaultValue={editingExercise.name} required /></label>
            <label><span>{t("muscleGroup")}</span><input name="muscle_group" defaultValue={editingExercise.muscle_group} required /></label>
            <label><span>{t("equipment")}</span><input name="equipment" defaultValue={editingExercise.equipment} required /></label>
            <label><span>{t("difficulty")}</span><select name="difficulty" defaultValue={editingExercise.difficulty}><option value="beginner">{t("beginner")}</option><option value="intermediate">{t("intermediate")}</option><option value="advanced">{t("advanced")}</option></select></label>
            <label><span>{t("movementPattern")}</span><select name="motion_type" defaultValue={editingExercise.motion_type}><option value="squat">{t("patternSquat")}</option><option value="hinge">{t("patternHinge")}</option><option value="push">{t("patternPush")}</option><option value="pull">{t("patternPull")}</option><option value="lunge">{t("patternLunge")}</option><option value="plank">{t("patternPlank")}</option><option value="curl">{t("patternCurl")}</option><option value="press">{t("patternPress")}</option><option value="custom">{t("patternCustom")}</option></select></label>
            <label className="full"><span>{t("coachingInstructions")}</span><textarea name="instructions" rows={4} defaultValue={editingExercise.instructions || ""} /></label>
          </div>
          <ActionMessage state={editExerciseState} />
          <button className="button primary" type="submit" disabled={editExercisePending}>{editExercisePending ? tc("saving") : t("saveExerciseChanges")}</button>
        </form>
      </section>
      </div></div> : null}

      {deletingExercise ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeletingExercise(null)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("deleteExerciseAria", { name: deletingExercise.name })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeletingExercise(null)}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">{t("deleteExerciseEyebrow")}</span><h2>{t("deleteExerciseTitle", { name: deletingExercise.name })}</h2><p>{t("deleteExerciseBody")}</p><form action={deleteExerciseFormAction}><input type="hidden" name="id" value={deletingExercise.id} /><ActionMessage state={deleteExerciseState} /><div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeletingExercise(null)}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={deleteExercisePending}>{deleteExercisePending ? tc("deleting") : t("deleteExerciseButton")}</button></div></form></section></div></div> : null}

      {exerciseModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setExerciseModal(false)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label={t("addExerciseTitle")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setExerciseModal(false)}><X size={18} /></button>
      <section className="builder-panel library-panel exercise-library-panel">
        <header><span className="eyebrow">{t("addExerciseEyebrow")}</span><h2>{t("addExerciseTitle")}</h2><p>{t("addExerciseHint")}</p></header>
        <form action={exerciseAction} className="builder-form">
          <MediaUploader name="New exercise" />
          <div className="form-grid">
            <label><span>{t("exerciseName")}</span><input name="name" placeholder={t("exerciseNamePlaceholder")} required /></label>
            <label><span>{t("muscleGroup")}</span><input name="muscle_group" placeholder={t("muscleGroupPlaceholder")} required /></label>
            <label><span>{t("equipment")}</span><input name="equipment" defaultValue="Bodyweight" required /></label>
            <label><span>{t("difficulty")}</span><select name="difficulty" defaultValue="beginner"><option value="beginner">{t("beginner")}</option><option value="intermediate">{t("intermediate")}</option><option value="advanced">{t("advanced")}</option></select></label>
            <label><span>{t("movementPattern")}</span><select name="motion_type" defaultValue="custom"><option value="squat">{t("patternSquat")}</option><option value="hinge">{t("patternHinge")}</option><option value="push">{t("patternPush")}</option><option value="pull">{t("patternPull")}</option><option value="lunge">{t("patternLunge")}</option><option value="plank">{t("patternPlank")}</option><option value="curl">{t("patternCurl")}</option><option value="press">{t("patternPress")}</option><option value="custom">{t("patternCustom")}</option></select></label>
            <label className="full"><span>{t("coachingInstructions")}</span><textarea name="instructions" rows={4} placeholder={t("coachingInstructionsPlaceholder")} /></label>
          </div>
          <ActionMessage state={exerciseState} />
          <button className="button secondary" type="submit" disabled={exercisePending}>{exercisePending ? tc("saving") : t("saveExerciseToLibrary")}</button>
        </form>
      </section>
      </div></div> : null}

      {programModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setProgramModal(false)}><div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={tf("title")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setProgramModal(false)}><X size={18} /></button>
      <section className="builder-panel composer-panel">
        <header><span className="eyebrow">{tf("eyebrow")}</span><h2>{tf("title")}</h2><p>{tf("hint")}</p></header>
        <form action={planAction} className="builder-form">
          <div className="form-grid">
            <label><span>{tf("client")}</span><select name="client_id" defaultValue="" required><option value="" disabled>{tf("selectClient")}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label><span>{tf("programTitle")}</span><input name="title" placeholder={tf("programTitlePlaceholder")} required /></label>
            <label><span>{tf("programLength")}</span><input name="weeks" type="number" min="1" max="52" defaultValue="6" required /></label>
            <label><span>{tf("startsOn")}</span><input name="starts_on" type="date" defaultValue={defaultDate} required /></label>
            <label><span>{tf("saveAs")}</span><select name="status" defaultValue="active"><option value="active">{tf("activeProgram")}</option><option value="draft">{tf("draft")}</option></select></label>
          </div>

          <div className="composer-list-head"><div><strong>{tf("programExercises")}</strong><span>{tf("movementsCount", { count: selectedExercises.length })}</span></div><button className="button secondary small" type="button" onClick={addExercise} disabled={exercises.length === 0}><Plus size={14} /> {tf("addExercise")}</button></div>
          <div className="composer-rows workout-composer-rows">
            {selectedExercises.map((selection, index) => {
              const exercise = exercises.find((item) => item.id === selection.exerciseId) || exercises[0];
              return (
                <div className="composer-row workout-row" key={selection.key}>
                  <span className="row-number">{index + 1}</span>
                  {exercise ? <ExerciseMedia variant="thumb" className="composer-thumb" url={exercise.media_url} name={exercise.name} muscleGroup={exercise.muscle_group} /> : null}
                  <label className="exercise-select"><span>{tf("exercise")}</span><select value={selection.exerciseId} onChange={(event) => updateExercise(selection.key, { exerciseId: Number(event.target.value) })}>{exercises.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.muscle_group}</option>)}</select></label>
                  <label><span>{tf("day")}</span><input value={selection.day} onChange={(event) => updateExercise(selection.key, { day: event.target.value })} /></label>
                  <label><span>{tf("sets")}</span><input type="number" min="1" max="20" value={selection.sets} onChange={(event) => updateExercise(selection.key, { sets: Number(event.target.value) })} /></label>
                  <label><span>{tf("reps")}</span><input value={selection.reps} onChange={(event) => updateExercise(selection.key, { reps: event.target.value })} /></label>
                  <label><span>{tf("rpe")}</span><input type="number" min="1" max="10" step="0.5" value={selection.rpe} onChange={(event) => updateExercise(selection.key, { rpe: Number(event.target.value) })} /></label>
                  <label><span>{tf("restSec")}</span><input type="number" min="0" max="1200" value={selection.restSeconds} onChange={(event) => updateExercise(selection.key, { restSeconds: Number(event.target.value) })} /></label>
                  <button type="button" className="icon-button" aria-label={tf("removeExercise")} onClick={() => setSelectedExercises((current) => current.filter((item) => item.key !== selection.key))}><Trash2 size={15} /></button>
                </div>
              );
            })}
            {selectedExercises.length === 0 ? <div className="builder-empty">{tf("emptyExercisesHint")}</div> : null}
          </div>
          <input type="hidden" name="exercises_json" value={JSON.stringify(selectedExercises.map(({ exerciseId, day, sets, reps, rpe, restSeconds }) => ({ exerciseId, day, sets, reps, rpe, restSeconds })))} />
          <ActionMessage state={planState} />
          <button className="button primary" type="submit" disabled={planPending || selectedExercises.length === 0}>{planPending ? tc("assigning") : tf("createAndAssign")}</button>
        </form>
      </section>
      </div></div> : null}

      {starterModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setStarterModal(false)}><div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label={ts("modalAria")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setStarterModal(false)}><X size={18} /></button>
      <section className="builder-panel library-panel">
        <header><span className="eyebrow">{ts("eyebrow")}</span><h2>{ts("title")}</h2><p>{ts("hint")}</p></header>
        <form action={starterAction} className="starter-add-all">
          <input type="hidden" name="names" value="" />
          <div className="composer-list-head"><div><strong>{ts("exercisesWithDemos", { count: STARTER_EXERCISES.length })}</strong><span>{ts("categories")}</span></div><button className="button primary small" type="submit" disabled={starterPending}>{starterPending ? tc("adding") : ts("addAll")}</button></div>
        </form>
        <ActionMessage state={starterState} />
        <div className="exercise-gallery starter-gallery">
          {STARTER_EXERCISES.map((starter) => {
            const added = existingExerciseNames.has(starter.name.toLowerCase());
            return (
              <article className="exercise-tile" key={starter.name}>
                <div className="exercise-tile-media">
                  <ExerciseMedia variant="tile" url={starter.media_url} name={starter.name} muscleGroup={starter.muscle_group} />
                  <span className="exercise-tile-badge">{starter.muscle_group}</span>
                </div>
                <div className="exercise-tile-body">
                  <h3>{starter.name}</h3>
                  <div className="exercise-tile-tags"><span className="exercise-tag">{starter.equipment}</span><span className={`exercise-tag diff-${starter.difficulty}`}>{difficultyLabel(t, starter.difficulty)}</span></div>
                  {added ? <span className="starter-added"><Check size={13} /> {ts("inLibrary")}</span> : <form action={starterAction}><input type="hidden" name="names" value={JSON.stringify([starter.name])} /><button className="button secondary small full" type="submit" disabled={starterPending}><Plus size={13} /> {ts("add")}</button></form>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      </div></div> : null}
    </>
  );
}
