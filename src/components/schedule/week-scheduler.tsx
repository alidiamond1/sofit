"use client";

import { CalendarCheck, ChevronRight, Dumbbell, Moon, Save, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useState, type ReactNode } from "react";
import { setDayScheduleAction, type ScheduleActionState } from "@/app/actions/schedule";

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
  const t = useTranslations("Schedule");
  const tc = useTranslations("Common");
  const dayLabels = tc.raw("days") as string[];
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
        <h3>{t("pickClientTitle")}</h3>
        <p>{t("pickClientHint")}</p>
        <label className="scheduler-client-picker">
          <span>{t("clientLabel")}</span>
          <select defaultValue="" onChange={(event) => event.target.value && router.push(`/coach/schedule?client=${event.target.value}`)}>
            <option value="" disabled>{t("selectAClient")}</option>
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
          <span>{t("planningWeekFor")}</span>
          <select value={String(selectedClientId)} onChange={(event) => router.push(`/coach/schedule?client=${event.target.value}`)}>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <div className="scheduler-summary"><strong>{trainingDays}</strong><span>{t("trainingDaysWeek")}</span></div>
      </Card>
      {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-message success" role="status">{state.success}</p> : null}
      {workoutPlans.length === 0 && dietPlans.length === 0 ? (
        <p className="scheduler-hint">{t("noPlansHint")}</p>
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
                <strong>{dayLabels[slot.weekday]}</strong>
                <label className="scheduler-rest">
                  <input type="checkbox" name="is_rest" checked={slot.isRest} onChange={(event) => update(slot.weekday, { isRest: event.target.checked })} />
                  <Moon size={13} /> {t("rest")}
                </label>
              </div>
              {slot.isRest ? (
                <p className="scheduler-rest-note">{t("restNote")}</p>
              ) : (
                <div className="scheduler-day-body">
                  <label>
                    <span><Dumbbell size={12} /> {t("workout")}</span>
                    <select name="workout_plan_id" value={slot.workoutPlanId != null ? String(slot.workoutPlanId) : ""} onChange={(event) => update(slot.weekday, { workoutPlanId: event.target.value ? Number(event.target.value) : null, workoutDay: null })}>
                      <option value="">{t("none")}</option>
                      {workoutPlans.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                    </select>
                  </label>
                  {plan && dayOptions.length ? (
                    <label>
                      <span>{t("day")}</span>
                      <select name="workout_day" value={slot.workoutDay ?? ""} onChange={(event) => update(slot.weekday, { workoutDay: event.target.value || null })}>
                        <option value="">{t("wholePlan")}</option>
                        {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                      </select>
                    </label>
                  ) : (
                    <input type="hidden" name="workout_day" value="" />
                  )}
                  <label>
                    <span><Utensils size={12} /> {t("diet")}</span>
                    <select name="diet_plan_id" value={slot.dietPlanId != null ? String(slot.dietPlanId) : ""} onChange={(event) => update(slot.weekday, { dietPlanId: event.target.value ? Number(event.target.value) : null })}>
                      <option value="">{t("none")}</option>
                      {dietPlans.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <button className="button primary small full" type="submit" disabled={rowSaving}>
                {rowSaving ? t("saving") : <><Save size={13} /> {t("saveDay")}</>}
              </button>
            </form>
          );
        })}
      </div>
      <p className="scheduler-scroll-hint" aria-hidden="true">
        {t("scrollForMoreDays")} <ChevronRight size={13} />
      </p>
    </>
  );
}

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}
