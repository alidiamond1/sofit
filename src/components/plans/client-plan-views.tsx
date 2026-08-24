"use client";

import { ChevronDown, X } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { ExerciseMedia } from "./exercise-media";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { toggleMealCompletionAction, toggleWorkoutExerciseAction } from "@/app/actions/plan-progress";

export type ExerciseDetail = {
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  mediaUrl: string | null;
  day: string;
  sets: string;
  reps: string;
  rpe: string;
  restSeconds: number;
  instructions: string | null;
};

export type ClientExercise = ExerciseDetail & {
  key: string;
  workoutPlanId: number;
  doneToday: boolean;
  loggedToday: { setsCompleted: string | null; repsCompleted: string | null; weightKg: string | null; notes: string | null } | null;
  history: Array<{ date: string; setsCompleted: string | null; repsCompleted: string | null; weightKg: string | null; notes: string | null }>;
};

export type MealDetail = {
  name: string;
  type: string;
  time: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  mediaUrl: string | null;
  ingredients: string[];
  instructions: string | null;
  day?: string;
};

export type ClientMeal = MealDetail & {
  key: string;
  dietPlanId: number;
  doneToday: boolean;
  history: string[];
};

const historyDateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatHistoryDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : historyDateFormat.format(date);
}

function shiftDate(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function last7Days(today: string) {
  return Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 6));
}

function DetailModal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <ModalPortal>
      <div className="plan-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <div className="plan-modal detail-modal" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
          <div className="detail-panel">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function ExerciseDetailModal({ exercise, onClose }: { exercise: ExerciseDetail; onClose: () => void }) {
  return (
    <DetailModal label={exercise.name} onClose={onClose}>
      <ExerciseMedia variant="hero" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
      <div className="detail-head">
        <span className="eyebrow">{[exercise.day, exercise.muscleGroup].filter(Boolean).join(" · ")}</span>
        <h2>{exercise.name}</h2>
        <div className="detail-tags">
          {exercise.equipment ? <span className="exercise-tag">{exercise.equipment}</span> : null}
          {exercise.difficulty ? <span className={`exercise-tag diff-${exercise.difficulty}`}>{exercise.difficulty}</span> : null}
        </div>
      </div>
      <div className="detail-metrics">
        <div><strong>{exercise.sets}</strong><span>sets</span></div>
        <div><strong>{exercise.reps}</strong><span>reps</span></div>
        <div><strong>{exercise.rpe}</strong><span>RPE</span></div>
        <div><strong>{exercise.restSeconds}s</strong><span>rest</span></div>
      </div>
      <div className="detail-instructions">
        <h4>How to perform</h4>
        <p>{exercise.instructions || "Your coach hasn't added detailed cues yet. Follow the prescribed sets, reps, and rest, and keep strict form throughout."}</p>
      </div>
    </DetailModal>
  );
}

export function MealDetailModal({ meal, onClose }: { meal: MealDetail; onClose: () => void }) {
  return (
    <DetailModal label={meal.name} onClose={onClose}>
      <ExerciseMedia variant="hero" context="meal" url={meal.mediaUrl} name={meal.name} />
      <div className="detail-head">
        <span className="eyebrow">{[meal.type, meal.time].filter(Boolean).join(" · ")}</span>
        <h2>{meal.name}</h2>
      </div>
      <div className="detail-metrics">
        <div><strong>{meal.calories || "—"}</strong><span>kcal</span></div>
        <div><strong>{meal.protein || "—"}</strong><span>protein g</span></div>
        <div><strong>{meal.carbs || "—"}</strong><span>carbs g</span></div>
        <div><strong>{meal.fat || "—"}</strong><span>fat g</span></div>
      </div>
      {meal.ingredients.length ? (
        <div className="detail-instructions">
          <h4>Ingredients &amp; amounts</h4>
          <ul className="detail-ingredients">{meal.ingredients.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      ) : null}
      <div className="detail-instructions">
        <h4>How to prepare</h4>
        <p>{meal.instructions || "Follow the ingredients and amounts above."}</p>
      </div>
    </DetailModal>
  );
}

function StatusToggle({ done, pending, onSetDoing, onSetDone }: { done: boolean; pending: boolean; onSetDoing: () => void; onSetDone: () => void }) {
  return (
    <div className="status-toggle" role="group" aria-label="Mark status">
      <button type="button" className={done ? "" : "active"} disabled={pending} onClick={onSetDoing}>Doing</button>
      <button type="button" className={done ? "active" : ""} disabled={pending} onClick={onSetDone}>Done</button>
    </div>
  );
}

function ExerciseRow({ exercise }: { exercise: ClientExercise }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(exercise.doneToday);
  const [pending, startTransition] = useTransition();
  const [sets, setSets] = useState(exercise.loggedToday?.setsCompleted ?? "");
  const [reps, setReps] = useState(exercise.loggedToday?.repsCompleted ?? "");
  const [weight, setWeight] = useState(exercise.loggedToday?.weightKg ?? "");
  const [notes, setNotes] = useState(exercise.loggedToday?.notes ?? "");

  function submit(nextDone: boolean) {
    setDone(nextDone);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("workout_plan_id", String(exercise.workoutPlanId));
      formData.set("item_key", exercise.key);
      formData.set("done", String(nextDone));
      if (nextDone) {
        formData.set("sets_completed", sets);
        formData.set("reps_completed", reps);
        formData.set("weight_kg", weight);
        formData.set("notes", notes);
      }
      const result = await toggleWorkoutExerciseAction({}, formData);
      if (result.error) setDone(!nextDone);
    });
  }

  return (
    <>
      <article
        className="is-clickable"
        role="button"
        tabIndex={0}
        aria-label={`Log ${exercise.name}`}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }}
      >
        <ExerciseMedia variant="thumb" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
        <div><span>{[exercise.day, exercise.muscleGroup].filter(Boolean).join(" · ")}</span><h3>{exercise.name}</h3><p>{exercise.instructions || exercise.equipment || "Tap to log this exercise."}</p></div>
        <div className="plan-item-side">
          <div className="exercise-prescription"><strong>{exercise.sets} × {exercise.reps}</strong><span className="rpe-pill">RPE {exercise.rpe} · {exercise.restSeconds}s rest</span></div>
          {done ? <span className="plan-status-chip">Done</span> : null}
        </div>
      </article>
      {open ? (
        <DetailModal label={exercise.name} onClose={() => setOpen(false)}>
          <ExerciseMedia variant="hero" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
          <div className="detail-head">
            <span className="eyebrow">{[exercise.day, exercise.muscleGroup].filter(Boolean).join(" · ")}</span>
            <h2>{exercise.name}</h2>
            <div className="detail-tags">
              {exercise.equipment ? <span className="exercise-tag">{exercise.equipment}</span> : null}
              {exercise.difficulty ? <span className={`exercise-tag diff-${exercise.difficulty}`}>{exercise.difficulty}</span> : null}
            </div>
          </div>
          <div className="detail-metrics">
            <div><strong>{exercise.sets}</strong><span>sets</span></div>
            <div><strong>{exercise.reps}</strong><span>reps</span></div>
            <div><strong>{exercise.rpe}</strong><span>RPE</span></div>
            <div><strong>{exercise.restSeconds}s</strong><span>rest</span></div>
          </div>
          <div className="detail-instructions">
            <h4>How to perform</h4>
            <p>{exercise.instructions || "Your coach hasn't added detailed cues yet. Follow the prescribed sets, reps, and rest, and keep strict form throughout."}</p>
          </div>
          <div className="plan-log-form form-grid">
            <label><span>Sets done</span><input inputMode="numeric" placeholder={exercise.sets} value={sets} onChange={(event) => setSets(event.target.value)} /></label>
            <label><span>Reps done</span><input inputMode="numeric" placeholder={exercise.reps} value={reps} onChange={(event) => setReps(event.target.value)} /></label>
            <label><span>Weight (kg)</span><input inputMode="decimal" placeholder="e.g. 60" value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
            <label className="full"><span>Notes</span><textarea rows={2} placeholder="How did it feel?" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          </div>
          <div className="plan-progress-row">
            <StatusToggle done={done} pending={pending} onSetDoing={() => submit(false)} onSetDone={() => submit(true)} />
            {exercise.history.length ? (
              <ul className="exercise-history">
                {exercise.history.slice(0, 4).map((entry) => (
                  <li key={entry.date}>
                    <span>{formatHistoryDate(entry.date)}</span>
                    <strong>{[entry.setsCompleted, entry.repsCompleted].filter(Boolean).join(" × ") || "Done"}{entry.weightKg ? ` @ ${entry.weightKg}kg` : ""}</strong>
                  </li>
                ))}
              </ul>
            ) : <p className="plan-empty-history">No sessions logged yet.</p>}
          </div>
        </DetailModal>
      ) : null}
    </>
  );
}

function MealRow({ meal, today }: { meal: ClientMeal; today: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(meal.doneToday);
  const [pending, startTransition] = useTransition();

  function submit(nextDone: boolean) {
    setDone(nextDone);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("diet_plan_id", String(meal.dietPlanId));
      formData.set("item_key", meal.key);
      formData.set("done", String(nextDone));
      const result = await toggleMealCompletionAction({}, formData);
      if (result.error) setDone(!nextDone);
    });
  }

  const history = done && !meal.history.includes(today) ? [...meal.history, today] : meal.history;

  return (
    <>
      <article
        className="is-clickable"
        role="button"
        tabIndex={0}
        aria-label={`Log ${meal.name}`}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }}
      >
        <time>{meal.time || "--:--"}</time>
        <ExerciseMedia variant="thumb" context="meal" className="meal-row-thumb" url={meal.mediaUrl} name={meal.name} />
        <div><span className="meal-type">{[meal.day, meal.type].filter(Boolean).join(" · ")}</span><h3>{meal.name}</h3><p>{meal.ingredients.join(" · ") || "Tap to log this meal."}</p></div>
        <div className="plan-item-side">
          <strong>{meal.calories ? `${meal.calories} kcal` : ""}</strong>
          {done ? <span className="plan-status-chip">Done</span> : null}
        </div>
      </article>
      {open ? (
        <DetailModal label={meal.name} onClose={() => setOpen(false)}>
          <ExerciseMedia variant="hero" context="meal" url={meal.mediaUrl} name={meal.name} />
          <div className="detail-head">
            <span className="eyebrow">{[meal.day, meal.type, meal.time].filter(Boolean).join(" · ")}</span>
            <h2>{meal.name}</h2>
          </div>
          <div className="detail-metrics">
            <div><strong>{meal.calories || "—"}</strong><span>kcal</span></div>
            <div><strong>{meal.protein || "—"}</strong><span>protein g</span></div>
            <div><strong>{meal.carbs || "—"}</strong><span>carbs g</span></div>
            <div><strong>{meal.fat || "—"}</strong><span>fat g</span></div>
          </div>
          {meal.ingredients.length ? (
            <div className="detail-instructions">
              <h4>Ingredients &amp; amounts</h4>
              <ul className="detail-ingredients">{meal.ingredients.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </div>
          ) : null}
          <div className="detail-instructions">
            <h4>How to prepare</h4>
            <p>{meal.instructions || "Follow the ingredients and amounts above."}</p>
          </div>
          <div className="plan-progress-row">
            <StatusToggle done={done} pending={pending} onSetDoing={() => submit(false)} onSetDone={() => submit(true)} />
            <div className="history-strip" aria-label="Last 7 days">
              {last7Days(today).map((date) => (
                <span key={date} className={`history-dot${history.includes(date) ? " is-done" : ""}`} title={`${formatHistoryDate(date)}${history.includes(date) ? " · done" : ""}`} />
              ))}
            </div>
          </div>
        </DetailModal>
      ) : null}
    </>
  );
}

/** Full tracking view: used on the client's "My Workout Plan" page, where
 *  every exercise belongs to a concrete plan the client can log against. */
export function WorkoutExerciseLogList({ exercises }: { exercises: ClientExercise[] }) {
  return (
    <div className="client-exercise-list rich">
      {exercises.map((exercise, index) => <ExerciseRow key={`${exercise.key}-${index}`} exercise={exercise} />)}
      {exercises.length === 0 ? <p>No exercises are listed in this program.</p> : null}
    </div>
  );
}

/** Full tracking view: used on the client's "My diet plan" page. */
export function DietMealLogList({ meals, today }: { meals: ClientMeal[]; today: string }) {
  return (
    <div className="client-meal-timeline rich">
      {meals.map((meal, index) => <MealRow key={`${meal.key}-${index}`} meal={meal} today={today} />)}
      {meals.length === 0 ? <p>No meals are listed in this plan.</p> : null}
    </div>
  );
}

/** Read-only preview: used for schedule/calendar previews (e.g. "what a
 *  Monday looks like") where there is no single concrete day to log against. */
export function WorkoutExerciseList({ exercises }: { exercises: ExerciseDetail[] }) {
  const [active, setActive] = useState<ExerciseDetail | null>(null);
  return (
    <>
      <div className="client-exercise-list rich">
        {exercises.map((exercise, index) => (
          <article
            key={`${exercise.name}-${index}`}
            className="is-clickable"
            role="button"
            tabIndex={0}
            aria-label={`View ${exercise.name} details`}
            onClick={() => setActive(exercise)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(exercise); } }}
          >
            <ExerciseMedia variant="thumb" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
            <div><span>{[exercise.day, exercise.muscleGroup].filter(Boolean).join(" · ")}</span><h3>{exercise.name}</h3><p>{exercise.instructions || exercise.equipment || "Tap to see how to perform this exercise."}</p></div>
            <div className="exercise-prescription"><strong>{exercise.sets} × {exercise.reps}</strong><span className="rpe-pill">RPE {exercise.rpe} · {exercise.restSeconds}s rest</span></div>
          </article>
        ))}
        {exercises.length === 0 ? <p>No exercises are listed in this program.</p> : null}
      </div>
      {active ? <ExerciseDetailModal exercise={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}

/** Read-only preview: used for schedule/calendar previews. */
export function MealTimeline({ meals }: { meals: MealDetail[] }) {
  const [active, setActive] = useState<MealDetail | null>(null);
  return (
    <>
      <div className="client-meal-timeline rich">
        {meals.map((meal, index) => (
          <article
            key={`${meal.name}-${index}`}
            className="is-clickable"
            role="button"
            tabIndex={0}
            aria-label={`View ${meal.name} details`}
            onClick={() => setActive(meal)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(meal); } }}
          >
            <time>{meal.time || "--:--"}</time>
            <ExerciseMedia variant="thumb" context="meal" className="meal-row-thumb" url={meal.mediaUrl} name={meal.name} />
            <div><span className="meal-type">{meal.type}</span><h3>{meal.name}</h3><p>{meal.ingredients.join(" · ") || "Tap to see ingredients and amounts."}</p></div>
            <strong>{meal.calories ? `${meal.calories} kcal` : ""}</strong>
          </article>
        ))}
        {meals.length === 0 ? <p>No meals are listed in this plan.</p> : null}
      </div>
      {active ? <MealDetailModal meal={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}

/** Collapsible shell for a plan card: tap the title bar to show/hide the
 *  meal or exercise list beneath it. */
export function PlanCardShell({ title, metrics, defaultOpen = true, children }: { title: ReactNode; metrics: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div
        className="client-plan-title is-clickable"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((value) => !value); } }}
      >
        {title}
        <div className="plan-title-side">
          {metrics}
          <ChevronDown size={18} className={`plan-chevron${open ? " is-open" : ""}`} />
        </div>
      </div>
      {open ? children : null}
    </>
  );
}
