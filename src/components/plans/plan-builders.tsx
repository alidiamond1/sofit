"use client";

import { AlertTriangle, Dumbbell, Pencil, Plus, Trash2, Utensils, X } from "lucide-react";
import { useActionState, useState } from "react";
import {
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
import { ExerciseMotion, type ExerciseMotionType } from "./exercise-motion";

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
    { type: "breakfast", label: "Breakfast / Quraac" },
    { type: "lunch", label: "Lunch / Qado" },
    { type: "dinner", label: "Dinner / Casho" },
    { type: "snack", label: "Snacks" },
  ] as const;

  function addMeal() {
    if (!meals[0]) return;
    setSelectedMeals((current) => [...current, { key: `meal-${current.length}-${meals[0].id}`, mealId: meals[0].id, time: "08:00" }]);
  }

  return (
    <>
      <div className="plan-workspace-toolbar">
        <div><span className="workspace-icon"><Utensils size={19} /></span><div><strong>Meal library</strong><span>{meals.length} reusable meals, separated by type</span></div></div>
        <div><button className="button secondary" type="button" onClick={() => setMealModal(true)}><Plus size={15} /> Add meal</button><button className="button primary" type="button" onClick={() => setPlanModal(true)} disabled={meals.length === 0}><Plus size={15} /> Create diet plan</button></div>
      </div>
      <div className="typed-library-grid meal-library-grid">
        {mealGroups.map((group) => {
          const groupMeals = meals.filter((meal) => meal.meal_type === group.type);
          return <section className="typed-library-column" key={group.type}><header><span>{group.label}</span><strong>{groupMeals.length}</strong></header><div>{groupMeals.map((meal) => <article className="library-item-card" key={meal.id}><div className="library-card-top"><span className="library-item-type">{meal.meal_type}</span><div className="record-actions"><button className="mini-action" type="button" title="Edit meal" aria-label={`Edit ${meal.name}`} onClick={() => setEditingMeal(meal)}><Pencil size={13} /></button><button className="mini-action danger-action" type="button" title="Delete meal" aria-label={`Delete ${meal.name}`} onClick={() => setDeletingMeal(meal)}><Trash2 size={13} /></button></div></div><h3>{meal.name}</h3><p>{meal.calories ? `${meal.calories} calories` : "Calories not set"}</p></article>)}{groupMeals.length === 0 ? <div className="library-column-empty">No {group.type} meals yet.</div> : null}</div></section>;
        })}
      </div>

      {editingMeal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditingMeal(null)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label={`Edit ${editingMeal.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setEditingMeal(null)}><X size={18} /></button>
      <section className="builder-panel library-panel">
        <header><span className="eyebrow">Edit meal</span><h2>{editingMeal.name}</h2><p>Update this reusable meal. Existing client plans keep their saved snapshot.</p></header>
        <form action={editMealAction} className="builder-form">
          <input type="hidden" name="id" value={editingMeal.id} />
          <div className="form-grid">
            <label><span>Meal name</span><input name="name" defaultValue={editingMeal.name} required /></label>
            <label><span>Meal type</span><select name="meal_type" defaultValue={editingMeal.meal_type}><option value="breakfast">Breakfast / Quraac</option><option value="lunch">Lunch / Qado</option><option value="dinner">Dinner / Casho</option><option value="snack">Snack</option></select></label>
            <label><span>Calories</span><input name="calories" type="number" min="0" defaultValue={editingMeal.calories ?? ""} /></label>
            <label><span>Protein (g)</span><input name="protein_g" type="number" min="0" defaultValue={editingMeal.protein_g ?? ""} /></label>
            <label><span>Carbs (g)</span><input name="carbs_g" type="number" min="0" defaultValue={editingMeal.carbs_g ?? ""} /></label>
            <label><span>Fat (g)</span><input name="fat_g" type="number" min="0" defaultValue={editingMeal.fat_g ?? ""} /></label>
            <label className="full"><span>Ingredients</span><textarea name="ingredients" rows={4} defaultValue={editingMeal.ingredients} required /></label>
            <label className="full"><span>Preparation instructions</span><textarea name="instructions" rows={3} defaultValue={editingMeal.instructions || ""} /></label>
          </div>
          <ActionMessage state={editMealState} />
          <button className="button primary" type="submit" disabled={editMealPending}>{editMealPending ? "Saving..." : "Save meal changes"}</button>
        </form>
      </section>
      </div></div> : null}

      {deletingMeal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeletingMeal(null)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={`Delete ${deletingMeal.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setDeletingMeal(null)}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">Delete meal</span><h2>Delete {deletingMeal.name}?</h2><p>It will be removed from the reusable meal library. Existing assigned plans keep their saved meal details.</p><form action={deleteMealAction}><input type="hidden" name="id" value={deletingMeal.id} /><ActionMessage state={deleteMealState} /><div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeletingMeal(null)}>Cancel</button><button className="button danger" type="submit" disabled={deleteMealPending}>{deleteMealPending ? "Deleting..." : "Delete meal"}</button></div></form></section></div></div> : null}

      {mealModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setMealModal(false)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label="Add a meal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setMealModal(false)}><X size={18} /></button>
      <section className="builder-panel library-panel">
        <header><span className="eyebrow">Reusable library</span><h2>Add a meal</h2><p>Create breakfast, lunch, dinner, or snack options once, then reuse them in client plans.</p></header>
        <form action={mealAction} className="builder-form">
          <div className="form-grid">
            <label><span>Meal name</span><input name="name" placeholder="Chicken rice bowl" required /></label>
            <label><span>Meal type</span><select name="meal_type" defaultValue="breakfast"><option value="breakfast">Breakfast / Quraac</option><option value="lunch">Lunch / Qado</option><option value="dinner">Dinner / Casho</option><option value="snack">Snack</option></select></label>
            <label><span>Calories</span><input name="calories" type="number" min="0" /></label>
            <label><span>Protein (g)</span><input name="protein_g" type="number" min="0" /></label>
            <label><span>Carbs (g)</span><input name="carbs_g" type="number" min="0" /></label>
            <label><span>Fat (g)</span><input name="fat_g" type="number" min="0" /></label>
            <label className="full"><span>Ingredients</span><textarea name="ingredients" rows={4} placeholder="150g chicken, 200g rice, vegetables" required /></label>
            <label className="full"><span>Preparation instructions</span><textarea name="instructions" rows={3} placeholder="How the client prepares this meal" /></label>
          </div>
          <ActionMessage state={mealState} />
          <button className="button secondary" type="submit" disabled={mealPending}>{mealPending ? "Saving..." : "Save meal to library"}</button>
        </form>
      </section>
      </div></div> : null}

      {planModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setPlanModal(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label="Create a diet plan" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setPlanModal(false)}><X size={18} /></button>
      <section className="builder-panel composer-panel">
        <header><span className="eyebrow">Client assignment</span><h2>Build a diet plan</h2><p>Choose a client, daily targets, and meals in the order they should be eaten.</p></header>
        <form action={planAction} className="builder-form">
          <div className="form-grid">
            <label><span>Client</span><select name="client_id" defaultValue="" required><option value="" disabled>Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label><span>Plan title</span><input name="title" placeholder="Fat-loss meal plan" required /></label>
            <label><span>Daily calories</span><input name="daily_calories" type="number" min="0" required /></label>
            <label><span>Protein (g)</span><input name="protein_g" type="number" min="0" /></label>
            <label><span>Carbs (g)</span><input name="carbs_g" type="number" min="0" /></label>
            <label><span>Fat (g)</span><input name="fat_g" type="number" min="0" /></label>
            <label><span>Starts on</span><input name="starts_on" type="date" defaultValue={defaultDate} required /></label>
            <label><span>Save as</span><select name="status" defaultValue="active"><option value="active">Active plan</option><option value="draft">Draft</option></select></label>
          </div>

          <div className="composer-list-head"><div><strong>Daily meals</strong><span>{selectedMeals.length} selected</span></div><button className="button secondary small" type="button" onClick={addMeal} disabled={meals.length === 0}><Plus size={14} /> Add meal</button></div>
          <div className="composer-rows">
            {selectedMeals.map((selection, index) => {
              const meal = meals.find((item) => item.id === selection.mealId);
              return (
                <div className="composer-row meal-row" key={selection.key}>
                  <span className="row-number">{index + 1}</span>
                  <label><span>Meal</span><select value={selection.mealId} onChange={(event) => setSelectedMeals((current) => current.map((item) => item.key === selection.key ? { ...item, mealId: Number(event.target.value) } : item))}>{meals.map((item) => <option key={item.id} value={item.id}>{item.meal_type} - {item.name}</option>)}</select></label>
                  <label><span>Time</span><input type="time" value={selection.time} onChange={(event) => setSelectedMeals((current) => current.map((item) => item.key === selection.key ? { ...item, time: event.target.value } : item))} /></label>
                  <div className="row-preview"><strong>{meal?.calories || "-"}</strong><span>kcal</span></div>
                  <button type="button" className="icon-button" aria-label="Remove meal" onClick={() => setSelectedMeals((current) => current.filter((item) => item.key !== selection.key))}><Trash2 size={15} /></button>
                </div>
              );
            })}
            {selectedMeals.length === 0 ? <div className="builder-empty">Add breakfast, lunch, dinner, or snacks from your meal library.</div> : null}
          </div>
          <input type="hidden" name="meals_json" value={JSON.stringify(selectedMeals.map(({ mealId, time }) => ({ mealId, time })))} />
          <ActionMessage state={planState} />
          <button className="button primary" type="submit" disabled={planPending || selectedMeals.length === 0}>{planPending ? "Assigning..." : "Create and assign diet plan"}</button>
        </form>
      </section>
      </div></div> : null}
    </>
  );
}

export function WorkoutPlanBuilder({ clients, exercises, defaultDate }: { clients: PlanClient[]; exercises: ExerciseOption[]; defaultDate: string }) {
  const [exerciseModal, setExerciseModal] = useState(false);
  const [programModal, setProgramModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseOption | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<ExerciseOption | null>(null);
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
  const [motionType, setMotionType] = useState<ExerciseMotionType>("squat");
  const [selectedExercises, setSelectedExercises] = useState<Array<{ key: string; exerciseId: number; day: string; sets: number; reps: string; rpe: number; restSeconds: number }>>([]);

  function addExercise() {
    if (!exercises[0]) return;
    setSelectedExercises((current) => [...current, { key: `exercise-${current.length}-${exercises[0].id}`, exerciseId: exercises[0].id, day: "Day 1", sets: 3, reps: "8-12", rpe: 7, restSeconds: 90 }]);
  }

  function updateExercise(key: string, values: Partial<(typeof selectedExercises)[number]>) {
    setSelectedExercises((current) => current.map((item) => item.key === key ? { ...item, ...values } : item));
  }

  return (
    <>
      <div className="plan-workspace-toolbar">
        <div><span className="workspace-icon"><Dumbbell size={19} /></span><div><strong>Exercise library</strong><span>{exercises.length} reusable movements with visual guidance</span></div></div>
        <div><button className="button secondary" type="button" onClick={() => setExerciseModal(true)}><Plus size={15} /> Add exercise</button><button className="button primary" type="button" onClick={() => setProgramModal(true)} disabled={exercises.length === 0}><Plus size={15} /> Create workout plan</button></div>
      </div>
      <div className="exercise-library-grid">
        {exercises.map((exercise) => <article className="exercise-library-card" key={exercise.id}><div className="exercise-card-actions record-actions"><button className="mini-action" type="button" title="Edit exercise" aria-label={`Edit ${exercise.name}`} onClick={() => setEditingExercise(exercise)}><Pencil size={13} /></button><button className="mini-action danger-action" type="button" title="Delete exercise" aria-label={`Delete ${exercise.name}`} onClick={() => setDeletingExercise(exercise)}><Trash2 size={13} /></button></div><ExerciseMotion type={exercise.motion_type} mediaUrl={exercise.media_url} label={exercise.name} /><div><span>{exercise.muscle_group}</span><h3>{exercise.name}</h3><p>{exercise.equipment} - {exercise.difficulty}</p></div></article>)}
        {exercises.length === 0 ? <div className="library-page-empty"><Dumbbell size={24} /><strong>No exercises yet</strong><span>Use Add exercise to create the first movement.</span></div> : null}
      </div>

      {editingExercise ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditingExercise(null)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label={`Edit ${editingExercise.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setEditingExercise(null)}><X size={18} /></button>
      <section className="builder-panel library-panel exercise-library-panel">
        <header><span className="eyebrow">Edit exercise</span><h2>{editingExercise.name}</h2><p>Update the reusable movement. Existing assigned programs keep their saved prescription.</p></header>
        <ExerciseMotion type={editingExercise.motion_type} mediaUrl={editingExercise.media_url} label={editingExercise.name} />
        <form action={editExerciseAction} className="builder-form">
          <input type="hidden" name="id" value={editingExercise.id} />
          <div className="form-grid">
            <label><span>Exercise name</span><input name="name" defaultValue={editingExercise.name} required /></label>
            <label><span>Muscle group</span><input name="muscle_group" defaultValue={editingExercise.muscle_group} required /></label>
            <label><span>Equipment</span><input name="equipment" defaultValue={editingExercise.equipment} required /></label>
            <label><span>Difficulty</span><select name="difficulty" defaultValue={editingExercise.difficulty}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
            <label><span>Character motion</span><select name="motion_type" defaultValue={editingExercise.motion_type}><option value="squat">Squat</option><option value="hinge">Hinge</option><option value="push">Push</option><option value="pull">Pull</option><option value="lunge">Lunge</option><option value="plank">Plank</option><option value="curl">Curl</option><option value="press">Press</option><option value="custom">Custom</option></select></label>
            <label><span>GIF / image URL</span><input name="media_url" type="url" defaultValue={editingExercise.media_url || ""} /></label>
            <label className="full"><span>Coaching instructions</span><textarea name="instructions" rows={4} defaultValue={editingExercise.instructions || ""} /></label>
          </div>
          <ActionMessage state={editExerciseState} />
          <button className="button primary" type="submit" disabled={editExercisePending}>{editExercisePending ? "Saving..." : "Save exercise changes"}</button>
        </form>
      </section>
      </div></div> : null}

      {deletingExercise ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeletingExercise(null)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={`Delete ${deletingExercise.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setDeletingExercise(null)}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">Delete exercise</span><h2>Delete {deletingExercise.name}?</h2><p>It will be removed from the reusable exercise library. Existing assigned programs keep their saved exercise details.</p><form action={deleteExerciseFormAction}><input type="hidden" name="id" value={deletingExercise.id} /><ActionMessage state={deleteExerciseState} /><div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeletingExercise(null)}>Cancel</button><button className="button danger" type="submit" disabled={deleteExercisePending}>{deleteExercisePending ? "Deleting..." : "Delete exercise"}</button></div></form></section></div></div> : null}

      {exerciseModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setExerciseModal(false)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label="Add an exercise" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setExerciseModal(false)}><X size={18} /></button>
      <section className="builder-panel library-panel exercise-library-panel">
        <header><span className="eyebrow">Exercise library</span><h2>Add an exercise</h2><p>Select a built-in character motion or paste your own licensed GIF/image URL.</p></header>
        <ExerciseMotion type={motionType} label="New exercise" />
        <form action={exerciseAction} className="builder-form">
          <div className="form-grid">
            <label><span>Exercise name</span><input name="name" placeholder="Goblet squat" required /></label>
            <label><span>Muscle group</span><input name="muscle_group" placeholder="Legs" required /></label>
            <label><span>Equipment</span><input name="equipment" defaultValue="Bodyweight" required /></label>
            <label><span>Difficulty</span><select name="difficulty" defaultValue="beginner"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
            <label><span>Character motion</span><select name="motion_type" value={motionType} onChange={(event) => setMotionType(event.target.value as ExerciseMotionType)}><option value="squat">Squat</option><option value="hinge">Hinge</option><option value="push">Push</option><option value="pull">Pull</option><option value="lunge">Lunge</option><option value="plank">Plank</option><option value="curl">Curl</option><option value="press">Press</option><option value="custom">Custom</option></select></label>
            <label><span>GIF / image URL (optional)</span><input name="media_url" type="url" placeholder="https://.../exercise.gif" /></label>
            <label className="full"><span>Coaching instructions</span><textarea name="instructions" rows={4} placeholder="Setup, movement, breathing, and common mistakes" /></label>
          </div>
          <ActionMessage state={exerciseState} />
          <button className="button secondary" type="submit" disabled={exercisePending}>{exercisePending ? "Saving..." : "Save exercise to library"}</button>
        </form>
      </section>
      </div></div> : null}

      {programModal ? <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setProgramModal(false)}><div className="plan-modal extra-wide" role="dialog" aria-modal="true" aria-label="Create a workout plan" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setProgramModal(false)}><X size={18} /></button>
      <section className="builder-panel composer-panel">
        <header><span className="eyebrow">Program builder</span><h2>Build a workout plan</h2><p>Compose days and prescribe sets, reps, RPE, and rest for each exercise.</p></header>
        <form action={planAction} className="builder-form">
          <div className="form-grid">
            <label><span>Client</span><select name="client_id" defaultValue="" required><option value="" disabled>Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label><span>Program title</span><input name="title" placeholder="Upper / Lower Foundation" required /></label>
            <label><span>Program length</span><input name="weeks" type="number" min="1" max="52" defaultValue="6" required /></label>
            <label><span>Starts on</span><input name="starts_on" type="date" defaultValue={defaultDate} required /></label>
            <label><span>Save as</span><select name="status" defaultValue="active"><option value="active">Active program</option><option value="draft">Draft</option></select></label>
          </div>

          <div className="composer-list-head"><div><strong>Program exercises</strong><span>{selectedExercises.length} movements</span></div><button className="button secondary small" type="button" onClick={addExercise} disabled={exercises.length === 0}><Plus size={14} /> Add exercise</button></div>
          <div className="composer-rows workout-composer-rows">
            {selectedExercises.map((selection, index) => {
              const exercise = exercises.find((item) => item.id === selection.exerciseId) || exercises[0];
              return (
                <div className="composer-row workout-row" key={selection.key}>
                  <span className="row-number">{index + 1}</span>
                  {exercise ? <ExerciseMotion compact type={exercise.motion_type} mediaUrl={exercise.media_url} label={exercise.name} /> : null}
                  <label className="exercise-select"><span>Exercise</span><select value={selection.exerciseId} onChange={(event) => updateExercise(selection.key, { exerciseId: Number(event.target.value) })}>{exercises.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.muscle_group}</option>)}</select></label>
                  <label><span>Day</span><input value={selection.day} onChange={(event) => updateExercise(selection.key, { day: event.target.value })} /></label>
                  <label><span>Sets</span><input type="number" min="1" max="20" value={selection.sets} onChange={(event) => updateExercise(selection.key, { sets: Number(event.target.value) })} /></label>
                  <label><span>Reps</span><input value={selection.reps} onChange={(event) => updateExercise(selection.key, { reps: event.target.value })} /></label>
                  <label><span>RPE</span><input type="number" min="1" max="10" step="0.5" value={selection.rpe} onChange={(event) => updateExercise(selection.key, { rpe: Number(event.target.value) })} /></label>
                  <label><span>Rest sec</span><input type="number" min="0" max="1200" value={selection.restSeconds} onChange={(event) => updateExercise(selection.key, { restSeconds: Number(event.target.value) })} /></label>
                  <button type="button" className="icon-button" aria-label="Remove exercise" onClick={() => setSelectedExercises((current) => current.filter((item) => item.key !== selection.key))}><Trash2 size={15} /></button>
                </div>
              );
            })}
            {selectedExercises.length === 0 ? <div className="builder-empty">Add exercises from your library to begin the program.</div> : null}
          </div>
          <input type="hidden" name="exercises_json" value={JSON.stringify(selectedExercises.map(({ exerciseId, day, sets, reps, rpe, restSeconds }) => ({ exerciseId, day, sets, reps, rpe, restSeconds })))} />
          <ActionMessage state={planState} />
          <button className="button primary" type="submit" disabled={planPending || selectedExercises.length === 0}>{planPending ? "Assigning..." : "Create and assign workout plan"}</button>
        </form>
      </section>
      </div></div> : null}
    </>
  );
}
