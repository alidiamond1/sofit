"use client";

import { Check, Flame } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleExerciseDoneAction } from "@/app/actions/schedule";
import { ExerciseMedia } from "@/components/plans/exercise-media";
import { ExerciseDetailModal } from "@/components/plans/client-plan-views";

export type TodayExercise = {
  key: string;
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
  done: boolean;
};

export function TodayWorkout({
  exercises,
  planTitle,
  dayLabel,
}: {
  exercises: TodayExercise[];
  planTitle: string;
  dayLabel: string | null;
}) {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(exercises.map((exercise) => [exercise.key, exercise.done])),
  );
  const [detail, setDetail] = useState<TodayExercise | null>(null);
  const [, startTransition] = useTransition();

  function toggle(key: string) {
    const next = !done[key];
    setDone((current) => ({ ...current, [key]: next })); // optimistic
    startTransition(async () => {
      const formData = new FormData();
      formData.set("exercise_key", key);
      formData.set("done", String(next));
      const result = await toggleExerciseDoneAction({}, formData);
      if (result.error) setDone((current) => ({ ...current, [key]: !next })); // revert on failure
    });
  }

  const completed = exercises.filter((exercise) => done[exercise.key]).length;
  const total = exercises.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="today-workout card">
      <div className="today-workout-head">
        <div className="today-ring" role="img" aria-label={`${completed} of ${total} exercises complete`}>
          <svg viewBox="0 0 80 80">
            <circle className="today-ring-track" cx="40" cy="40" r={radius} />
            <circle className="today-ring-value" cx="40" cy="40" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }} />
          </svg>
          <div className="today-ring-center"><strong>{pct}%</strong><span>{completed}/{total}</span></div>
        </div>
        <div className="today-workout-copy">
          <span className="eyebrow">Today&rsquo;s workout</span>
          <h2>{planTitle}</h2>
          <p>{dayLabel ? `${dayLabel} · ` : ""}{total} exercise{total === 1 ? "" : "s"}{completed === total && total > 0 ? " · complete 🎉" : ""}</p>
        </div>
        <span className={`today-streak${completed === total && total > 0 ? " is-complete" : ""}`} role="status" aria-live="polite"><Flame size={15} /> {completed}/{total}</span>
      </div>
      <ul className="today-exercise-list">
        {exercises.map((exercise) => {
          const isDone = done[exercise.key];
          return (
            <li key={exercise.key} className={isDone ? "is-done" : ""}>
              <button type="button" className="today-open" onClick={() => setDetail(exercise)} aria-label={`View ${exercise.name} details`}>
                <ExerciseMedia variant="thumb" className="today-thumb" url={exercise.mediaUrl} name={exercise.name} muscleGroup={exercise.muscleGroup} />
                <div className="today-exercise-copy">
                  <span>{exercise.muscleGroup}</span>
                  <h3>{exercise.name}</h3>
                  <small>{exercise.sets} × {exercise.reps} · RPE {exercise.rpe} · {exercise.restSeconds}s rest</small>
                </div>
              </button>
              <button
                type="button"
                className={`today-check${isDone ? " is-done" : ""}`}
                aria-pressed={isDone}
                aria-label={isDone ? `Mark ${exercise.name} not done` : `Mark ${exercise.name} done`}
                onClick={() => toggle(exercise.key)}
              >
                <Check size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      {detail ? <ExerciseDetailModal exercise={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
