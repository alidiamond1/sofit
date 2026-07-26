"use client";

import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ExerciseMedia } from "./exercise-media";
import { ModalPortal } from "@/components/dashboard/modal-portal";

export type ClientExercise = {
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

export type ClientMeal = {
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
};

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

export function ExerciseDetailModal({ exercise, onClose }: { exercise: ClientExercise; onClose: () => void }) {
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

export function MealDetailModal({ meal, onClose }: { meal: ClientMeal; onClose: () => void }) {
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

export function WorkoutExerciseList({ exercises }: { exercises: ClientExercise[] }) {
  const [active, setActive] = useState<ClientExercise | null>(null);
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

export function MealTimeline({ meals }: { meals: ClientMeal[] }) {
  const [active, setActive] = useState<ClientMeal | null>(null);
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
