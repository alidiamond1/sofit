"use client";

import { CalendarCheck, Dumbbell, Moon, Save, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, type ReactNode } from "react";
import { setDayScheduleAction, type ScheduleActionState } from "@/app/actions/schedule";
import { WEEKDAYS } from "@/lib/schedule";

export type SchedulerPlan = { id: number; title: string; days: string[] };
export type SchedulerDiet = { id: number; title: string };
export type SchedulerClient = { id: number; name: string };
export type SchedulerSlot = {
  weekday: number;
  workoutPlanId: number | null;
  workoutDay: string | null;
  dietPlanId: number | null;
  isRest: boolean;
};

const initialState: ScheduleActionState = {};

export function WeekScheduler({
  clients,
  selectedClientId,
  workoutPlans,
  dietPlans,
  schedule,
}: {
  clients: SchedulerClient[];
  selectedClientId: number | null;
  workoutPlans: SchedulerPlan[];
  dietPlans: SchedulerDiet[];
  schedule: SchedulerSlot[];
}) {
  const router = useRouter();
  const [week, setWeek] = useState<SchedulerSlot[]>(() => schedule.map((slot) => ({ ...slot })));
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [state, action, pending] = useActionState(
    async (previous: ScheduleActionState, formData: FormData) => setDayScheduleAction(previous, formData),
    initialState,
  );

  function update(weekday: number, patch: Partial<SchedulerSlot>) {
    setWeek((current) => current.map((slot) => (slot.weekday === weekday ? { ...slot, ...patch } : slot)));
  }

  const trainingDays = week.filter((slot) => !slot.isRest && slot.workoutPlanId).length;

  if (!selectedClientId) {
    return (
      <Card className="scheduler-empty">
        <CalendarCheck size={26} />
        <h3>Pick a client to plan their week</h3>
        <p>Choose a client, then set the workout and diet for each day. The plan repeats every week.</p>
        <label className="scheduler-client-picker">
          <span>Client</span>
          <select defaultValue="" onChange={(event) => event.target.value && router.push(`/coach/schedule?client=${event.target.value}`)}>
            <option value="" disabled>Select a client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
      </Card>
    );
  }

  return (
    <>
      <Card className="scheduler-toolbar">
        <label className="scheduler-client-picker">
          <span>Planning the week for</span>
          <select value={String(selectedClientId)} onChange={(event) => router.push(`/coach/schedule?client=${event.target.value}`)}>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <div className="scheduler-summary"><strong>{trainingDays}</strong><span>training days / week</span></div>
      </Card>
      {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-message success" role="status">{state.success}</p> : null}
      {workoutPlans.length === 0 && dietPlans.length === 0 ? (
        <p className="scheduler-hint">This client has no assigned workout or diet plans yet. Create plans first, then schedule them here.</p>
      ) : null}
      <div className="scheduler-week">
        {week.map((slot) => {
          const plan = workoutPlans.find((option) => option.id === slot.workoutPlanId) || null;
          const dayOptions = plan?.days ?? [];
          const rowSaving = pending && savingDay === slot.weekday;
          return (
            <form key={slot.weekday} action={action} className={`scheduler-day card${slot.isRest ? " is-rest" : ""}`} onSubmit={() => setSavingDay(slot.weekday)}>
              <input type="hidden" name="client_id" value={selectedClientId} />
              <input type="hidden" name="weekday" value={slot.weekday} />
              <div className="scheduler-day-head">
                <strong>{WEEKDAYS[slot.weekday]}</strong>
                <label className="scheduler-rest">
                  <input type="checkbox" name="is_rest" checked={slot.isRest} onChange={(event) => update(slot.weekday, { isRest: event.target.checked })} />
                  <Moon size={13} /> Rest
                </label>
              </div>
              {slot.isRest ? (
                <p className="scheduler-rest-note">Rest &amp; recovery day.</p>
              ) : (
                <div className="scheduler-day-body">
                  <label>
                    <span><Dumbbell size={12} /> Workout</span>
                    <select name="workout_plan_id" value={slot.workoutPlanId != null ? String(slot.workoutPlanId) : ""} onChange={(event) => update(slot.weekday, { workoutPlanId: event.target.value ? Number(event.target.value) : null, workoutDay: null })}>
                      <option value="">None</option>
                      {workoutPlans.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                    </select>
                  </label>
                  {plan && dayOptions.length ? (
                    <label>
                      <span>Day</span>
                      <select name="workout_day" value={slot.workoutDay ?? ""} onChange={(event) => update(slot.weekday, { workoutDay: event.target.value || null })}>
                        <option value="">Whole plan</option>
                        {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                      </select>
                    </label>
                  ) : (
                    <input type="hidden" name="workout_day" value="" />
                  )}
                  <label>
                    <span><Utensils size={12} /> Diet</span>
                    <select name="diet_plan_id" value={slot.dietPlanId != null ? String(slot.dietPlanId) : ""} onChange={(event) => update(slot.weekday, { dietPlanId: event.target.value ? Number(event.target.value) : null })}>
                      <option value="">None</option>
                      {dietPlans.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <button className="button primary small full" type="submit" disabled={rowSaving}>
                {rowSaving ? "Saving…" : <><Save size={13} /> Save day</>}
              </button>
            </form>
          );
        })}
      </div>
    </>
  );
}

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}
