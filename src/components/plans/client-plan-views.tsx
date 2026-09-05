"use client";

import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { difficultyLabel } from "@/lib/status-labels";
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

/** Groups a plan's items into day sections, preserving first-seen order.
 *  Returns a single unlabeled group when nothing carries a `day` value. */
function groupByDay<T extends { day?: string }>(items: T[]): Array<{ day: string | null; items: T[] }> {
  const groups: Array<{ day: string | null; items: T[] }> = [];
  const indexByKey = new Map<string, number>();
  for (const item of items) {
    const day = item.day && item.day.trim() ? item.day.trim() : null;
    const key = day ?? "";
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ day, items: [] });
    }
    groups[indexByKey.get(key) as number].items.push(item);
  }
  return groups;
}

function DetailModal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const tc = useTranslations("Common");
  return (
    <ModalPortal>
      <div className="plan-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <div className="plan-modal detail-modal" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={onClose}><X size={18} /></button>
          <div className="detail-panel">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function ExerciseDetailModal({ exercise, onClose }: { exercise: ExerciseDetail; onClose: () => void }) {
  const t = useTranslations("ClientPlan");
  const td = useTranslations("Packages.exerciseLibrary");
  return (
    <DetailModal label={exercise.name} onClose={onClose}>
      <ExerciseMedia variant="hero" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
      <div className="detail-head">
        <span className="eyebrow">{[exercise.day, exercise.muscleGroup].filter(Boolean).join(" · ")}</span>
        <h2>{exercise.name}</h2>
        <div className="detail-tags">
          {exercise.equipment ? <span className="exercise-tag">{exercise.equipment}</span> : null}
          {exercise.difficulty ? <span className={`exercise-tag diff-${exercise.difficulty}`}>{difficultyLabel(td, exercise.difficulty)}</span> : null}
        </div>
      </div>
      <div className="detail-metrics">
        <div><strong>{exercise.sets}</strong><span>{t("setsUnit")}</span></div>
        <div><strong>{exercise.reps}</strong><span>{t("repsUnit")}</span></div>
        <div><strong>{exercise.rpe}</strong><span>RPE</span></div>
        <div><strong>{exercise.restSeconds}s</strong><span>{t("restUnit")}</span></div>
      </div>
      <div className="detail-instructions">
        <h4>{t("howToPerform")}</h4>
        <p>{exercise.instructions || t("exerciseInstructionsFallback")}</p>
      </div>
    </DetailModal>
  );
}

export function MealDetailModal({ meal, onClose }: { meal: MealDetail; onClose: () => void }) {
  const t = useTranslations("ClientPlan");
  return (
    <DetailModal label={meal.name} onClose={onClose}>
      <ExerciseMedia variant="hero" context="meal" url={meal.mediaUrl} name={meal.name} />
      <div className="detail-head">
        <span className="eyebrow">{[meal.type, meal.time].filter(Boolean).join(" · ")}</span>
        <h2>{meal.name}</h2>
      </div>
      <div className="detail-metrics">
        <div><strong>{meal.calories || "—"}</strong><span>{t("kcal")}</span></div>
        <div><strong>{meal.protein || "—"}</strong><span>{t("proteinG")}</span></div>
        <div><strong>{meal.carbs || "—"}</strong><span>{t("carbsG")}</span></div>
        <div><strong>{meal.fat || "—"}</strong><span>{t("fatG")}</span></div>
      </div>
      {meal.ingredients.length ? (
        <div className="detail-instructions">
          <h4>{t("ingredientsHeading")}</h4>
          <ul className="detail-ingredients">{meal.ingredients.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      ) : null}
      <div className="detail-instructions">
        <h4>{t("howToPrepare")}</h4>
        <p>{meal.instructions || t("mealInstructionsFallback")}</p>
      </div>
    </DetailModal>
  );
}

function StatusToggle({ done, pending, onSetDoing, onSetDone }: { done: boolean; pending: boolean; onSetDoing: () => void; onSetDone: () => void }) {
  const t = useTranslations("ClientPlan");
  return (
    <div className="status-toggle" role="group" aria-label={t("markStatusAria")}>
      <button type="button" className={done ? "" : "active"} disabled={pending} onClick={onSetDoing}>{t("doing")}</button>
      <button type="button" className={done ? "active" : ""} disabled={pending} onClick={onSetDone}>{t("done")}</button>
    </div>
  );
}

function ExerciseRow({ exercise, readOnly = false }: { exercise: ClientExercise; readOnly?: boolean }) {
  const t = useTranslations("ClientPlan");
  const td = useTranslations("Packages.exerciseLibrary");
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
        aria-label={t("logItemAria", { name: exercise.name })}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }}
      >
        <ExerciseMedia variant="thumb" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
        <div><span>{[exercise.day, exercise.muscleGroup].filter(Boolean).join(" · ")}</span><h3>{exercise.name}</h3><p>{exercise.instructions || exercise.equipment || t("tapToLogExercise")}</p></div>
        <div className="plan-item-side">
          <div className="exercise-prescription"><strong>{exercise.sets} × {exercise.reps}</strong><span className="rpe-pill">{t("rpeRestLine", { rpe: exercise.rpe, rest: exercise.restSeconds })}</span></div>
          {done ? <span className="plan-status-chip">{t("done")}</span> : null}
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
              {exercise.difficulty ? <span className={`exercise-tag diff-${exercise.difficulty}`}>{difficultyLabel(td, exercise.difficulty)}</span> : null}
            </div>
          </div>
          <div className="detail-metrics">
            <div><strong>{exercise.sets}</strong><span>{t("setsUnit")}</span></div>
            <div><strong>{exercise.reps}</strong><span>{t("repsUnit")}</span></div>
            <div><strong>{exercise.rpe}</strong><span>RPE</span></div>
            <div><strong>{exercise.restSeconds}s</strong><span>{t("restUnit")}</span></div>
          </div>
          <div className="detail-instructions">
            <h4>{t("howToPerform")}</h4>
            <p>{exercise.instructions || t("exerciseInstructionsFallback")}</p>
          </div>
          {readOnly ? null : (
            <div className="plan-log-form form-grid">
              <label><span>{t("setsDone")}</span><input inputMode="numeric" placeholder={exercise.sets} value={sets} onChange={(event) => setSets(event.target.value)} /></label>
              <label><span>{t("repsDone")}</span><input inputMode="numeric" placeholder={exercise.reps} value={reps} onChange={(event) => setReps(event.target.value)} /></label>
              <label><span>{t("weightKg")}</span><input inputMode="decimal" placeholder={t("weightPlaceholder")} value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
              <label className="full"><span>{t("notes")}</span><textarea rows={2} placeholder={t("feelPlaceholder")} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            </div>
          )}
          <div className="plan-progress-row">
            {readOnly ? null : <StatusToggle done={done} pending={pending} onSetDoing={() => submit(false)} onSetDone={() => submit(true)} />}
            {exercise.history.length ? (
              <ul className="exercise-history">
                {exercise.history.slice(0, 4).map((entry) => (
                  <li key={entry.date}>
                    <span>{formatHistoryDate(entry.date)}</span>
                    <strong>{[entry.setsCompleted, entry.repsCompleted].filter(Boolean).join(" × ") || t("done")}{entry.weightKg ? ` @ ${entry.weightKg}kg` : ""}</strong>
                  </li>
                ))}
              </ul>
            ) : <p className="plan-empty-history">{t("noSessionsLoggedYet")}</p>}
          </div>
        </DetailModal>
      ) : null}
    </>
  );
}

function MealRow({ meal, today, readOnly = false }: { meal: ClientMeal; today: string; readOnly?: boolean }) {
  const t = useTranslations("ClientPlan");
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
        aria-label={t("logItemAria", { name: meal.name })}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }}
      >
        <time>{meal.time || "--:--"}</time>
        <ExerciseMedia variant="thumb" context="meal" className="meal-row-thumb" url={meal.mediaUrl} name={meal.name} />
        <div><span className="meal-type">{[meal.day, meal.type].filter(Boolean).join(" · ")}</span><h3>{meal.name}</h3><p>{meal.ingredients.join(" · ") || t("tapToLogMeal")}</p></div>
        <div className="plan-item-side">
          <strong>{meal.calories ? `${meal.calories} kcal` : ""}</strong>
          {done ? <span className="plan-status-chip">{t("done")}</span> : null}
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
            <div><strong>{meal.calories || "—"}</strong><span>{t("kcal")}</span></div>
            <div><strong>{meal.protein || "—"}</strong><span>{t("proteinG")}</span></div>
            <div><strong>{meal.carbs || "—"}</strong><span>{t("carbsG")}</span></div>
            <div><strong>{meal.fat || "—"}</strong><span>{t("fatG")}</span></div>
          </div>
          {meal.ingredients.length ? (
            <div className="detail-instructions">
              <h4>{t("ingredientsHeading")}</h4>
              <ul className="detail-ingredients">{meal.ingredients.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </div>
          ) : null}
          <div className="detail-instructions">
            <h4>{t("howToPrepare")}</h4>
            <p>{meal.instructions || t("mealInstructionsFallback")}</p>
          </div>
          <div className="plan-progress-row">
            {readOnly ? null : <StatusToggle done={done} pending={pending} onSetDoing={() => submit(false)} onSetDone={() => submit(true)} />}
            <div className="history-strip" aria-label={t("last7Days")}>
              {last7Days(today).map((date) => (
                <span key={date} className={`history-dot${history.includes(date) ? " is-done" : ""}`} title={`${formatHistoryDate(date)}${history.includes(date) ? t("doneSuffix") : ""}`} />
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
export function WorkoutExerciseLogList({ exercises, readOnly = false }: { exercises: ClientExercise[]; readOnly?: boolean }) {
  const t = useTranslations("ClientPlan");
  const groups = groupByDay(exercises);
  const showHeadings = groups.length > 1;
  return (
    <div className="client-exercise-list rich">
      {groups.map((group, groupIndex) => (
        <div className="plan-day-group" key={group.day ?? `day-${groupIndex}`}>
          {showHeadings && group.day ? <div className="plan-day-head"><span>{group.day}</span><hr /></div> : null}
          {group.items.map((exercise, index) => <ExerciseRow key={`${exercise.key}-${groupIndex}-${index}`} exercise={exercise} readOnly={readOnly} />)}
        </div>
      ))}
      {exercises.length === 0 ? <p>{t("noExercisesListed")}</p> : null}
    </div>
  );
}

/** Full tracking view: used on the client's "My diet plan" page. */
export function DietMealLogList({ meals, today, readOnly = false }: { meals: ClientMeal[]; today: string; readOnly?: boolean }) {
  const t = useTranslations("ClientPlan");
  const groups = groupByDay(meals);
  const showHeadings = groups.length > 1;
  return (
    <div className="client-meal-timeline rich">
      {groups.map((group, groupIndex) => (
        <div className="plan-day-group" key={group.day ?? `day-${groupIndex}`}>
          {showHeadings && group.day ? <div className="plan-day-head"><span>{group.day}</span><hr /></div> : null}
          {group.items.map((meal, index) => <MealRow key={`${meal.key}-${groupIndex}-${index}`} meal={meal} today={today} readOnly={readOnly} />)}
        </div>
      ))}
      {meals.length === 0 ? <p>{t("noMealsListed")}</p> : null}
    </div>
  );
}

/** Read-only preview: used for schedule/calendar previews (e.g. "what a
 *  Monday looks like") where there is no single concrete day to log against. */
export function WorkoutExerciseList({ exercises }: { exercises: ExerciseDetail[] }) {
  const t = useTranslations("ClientPlan");
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
            aria-label={t("viewDetailsAria", { name: exercise.name })}
            onClick={() => setActive(exercise)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(exercise); } }}
          >
            <ExerciseMedia variant="thumb" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
            <div><span>{[exercise.day, exercise.muscleGroup].filter(Boolean).join(" · ")}</span><h3>{exercise.name}</h3><p>{exercise.instructions || exercise.equipment || t("tapToViewExercise")}</p></div>
            <div className="exercise-prescription"><strong>{exercise.sets} × {exercise.reps}</strong><span className="rpe-pill">{t("rpeRestLine", { rpe: exercise.rpe, rest: exercise.restSeconds })}</span></div>
          </article>
        ))}
        {exercises.length === 0 ? <p>{t("noExercisesListed")}</p> : null}
      </div>
      {active ? <ExerciseDetailModal exercise={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}

/** Read-only preview: used for schedule/calendar previews. */
export function MealTimeline({ meals }: { meals: MealDetail[] }) {
  const t = useTranslations("ClientPlan");
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
            aria-label={t("viewDetailsAria", { name: meal.name })}
            onClick={() => setActive(meal)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(meal); } }}
          >
            <time>{meal.time || "--:--"}</time>
            <ExerciseMedia variant="thumb" context="meal" className="meal-row-thumb" url={meal.mediaUrl} name={meal.name} />
            <div><span className="meal-type">{meal.type}</span><h3>{meal.name}</h3><p>{meal.ingredients.join(" · ") || t("tapToViewMeal")}</p></div>
            <strong>{meal.calories ? `${meal.calories} kcal` : ""}</strong>
          </article>
        ))}
        {meals.length === 0 ? <p>{t("noMealsListed")}</p> : null}
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
