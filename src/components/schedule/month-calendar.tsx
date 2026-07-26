"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock, Dumbbell, Utensils, X } from "lucide-react";
import { useState } from "react";
import { WEEKDAY_SHORT } from "@/lib/schedule";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { WorkoutExerciseList, MealTimeline, type ClientExercise, type ClientMeal } from "@/components/plans/client-plan-views";

export type CalendarSession = { date: string; title: string; time: string; status: string };

export type DaySchedule = {
  weekday: number;
  isRest: boolean;
  workout: { title: string; dayLabel: string | null; exercises: ClientExercise[] } | null;
  diet: { title: string; meals: ClientMeal[] } | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function sessionBadgeClass(status: string) {
  if (status === "attended") return "badge success";
  if (status === "scheduled") return "badge warning";
  if (status === "no_show" || status === "cancelled") return "badge danger";
  return "badge";
}

export function MonthCalendar({
  sessions,
  weekDays,
  today,
}: {
  sessions: CalendarSession[];
  weekDays: DaySchedule[];
  today: string; // YYYY-MM-DD in the client's timezone
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const base = new Date(`${today}T00:00:00`);
  const view = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  const sessionsByDate = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const list = sessionsByDate.get(session.date) || [];
    list.push(session);
    sessionsByDate.set(session.date, list);
  }
  const byWeekday = new Map(weekDays.map((day) => [day.weekday, day]));

  const cells: Array<{ day: number; iso: string; weekday: number } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
    cells.push({ day, iso, weekday: (new Date(`${iso}T00:00:00`).getDay() + 6) % 7 });
  }

  const activeWeekday = activeDate ? (new Date(`${activeDate}T00:00:00`).getDay() + 6) % 7 : null;
  const activeSchedule = activeWeekday != null ? byWeekday.get(activeWeekday) : undefined;
  const activeSessions = activeDate ? sessionsByDate.get(activeDate) || [] : [];

  return (
    <div className="calendar-card card">
      <div className="calendar-head">
        <div>
          <span className="eyebrow"><CalendarDays size={13} /> Your schedule</span>
          <h2>{monthLabel}</h2>
        </div>
        <div className="calendar-nav">
          <button className="icon-button" type="button" onClick={() => setMonthOffset((offset) => offset - 1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button className="button secondary small" type="button" onClick={() => setMonthOffset(0)}>Today</button>
          <button className="icon-button" type="button" onClick={() => setMonthOffset((offset) => offset + 1)} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="calendar-grid month">
        {WEEKDAY_SHORT.map((weekday) => <span key={weekday} className="calendar-dow">{weekday}</span>)}
        {cells.map((cell, index) => {
          if (!cell) return <span key={`blank-${index}`} className="calendar-cell is-blank" />;
          const schedule = byWeekday.get(cell.weekday);
          const daySessions = sessionsByDate.get(cell.iso) || [];
          const isToday = cell.iso === today;
          const hasWorkout = Boolean(schedule && !schedule.isRest && schedule.workout);
          const isRest = Boolean(schedule?.isRest);
          const classes = ["calendar-cell", "is-day"];
          if (isToday) classes.push("is-today");
          if (hasWorkout) classes.push("has-workout");
          return (
            <button key={cell.iso} type="button" className={classes.join(" ")} onClick={() => setActiveDate(cell.iso)} aria-label={`Open ${cell.iso} plan`}>
              <b>{cell.day}</b>
              <span className="calendar-pills">
                {hasWorkout ? <em className="cal-pill workout">{schedule!.workout!.dayLabel || "Workout"}</em> : isRest ? <em className="cal-pill rest">Rest</em> : null}
                {schedule && !schedule.isRest && schedule.diet ? <em className="cal-pill diet">Diet</em> : null}
                {daySessions.length ? <em className="cal-pill session">{daySessions.length === 1 ? daySessions[0].time : `${daySessions.length} sessions`}</em> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="cal-dot workout" /> Workout</span>
        <span><i className="cal-dot diet" /> Diet</span>
        <span><i className="cal-dot session" /> Session</span>
        <span><i className="cal-dot rest" /> Rest</span>
      </div>

      {activeDate ? (
        <ModalPortal>
          <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setActiveDate(null)}>
            <div className="plan-modal day-modal" role="dialog" aria-modal="true" aria-label={activeDate} onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setActiveDate(null)}><X size={18} /></button>
              <div className="day-panel">
                <header className="day-panel-head">
                  <span className="eyebrow">Scheduled for</span>
                  <h2>{new Date(`${activeDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
                </header>

                {activeSessions.length ? (
                  <section className="day-section">
                    <h4><Clock size={13} /> Sessions</h4>
                    <ul className="day-session-list">
                      {activeSessions.map((session, index) => (
                        <li key={index}><span>{session.time}</span><strong>{session.title}</strong><span className={sessionBadgeClass(session.status)}>{session.status}</span></li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="day-section">
                  <h4><Dumbbell size={13} /> Workout</h4>
                  {activeSchedule?.isRest ? (
                    <p className="day-rest">Rest &amp; recovery day.</p>
                  ) : activeSchedule?.workout ? (
                    <>
                      <p className="day-plan-name">{activeSchedule.workout.title}{activeSchedule.workout.dayLabel ? ` · ${activeSchedule.workout.dayLabel}` : ""}</p>
                      <WorkoutExerciseList exercises={activeSchedule.workout.exercises} />
                    </>
                  ) : (
                    <p className="day-empty">No workout scheduled for this day.</p>
                  )}
                </section>

                <section className="day-section">
                  <h4><Utensils size={13} /> Diet</h4>
                  {activeSchedule?.diet ? (
                    <>
                      <p className="day-plan-name">{activeSchedule.diet.title}</p>
                      <MealTimeline meals={activeSchedule.diet.meals} />
                    </>
                  ) : (
                    <p className="day-empty">No diet scheduled for this day.</p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
