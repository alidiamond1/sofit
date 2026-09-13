import { z } from "zod";

export const bodyMetricsSchema = z.object({
  height_cm: z.coerce.number().min(100, "Enter a height from 100 to 250 cm.").max(250, "Enter a height from 100 to 250 cm."),
  starting_weight_kg: z.coerce.number().min(30, "Enter a starting weight from 30 to 300 kg.").max(300, "Enter a starting weight from 30 to 300 kg."),
  date_of_birth: z.iso.date("Enter your date of birth.").refine((value) => value <= new Date().toISOString().slice(0, 10), "Date of birth cannot be in the future."),
  goals: z.string().trim().max(5000).transform((value) => value || null),
  medical_notes: z.string().trim().max(5000).transform((value) => value || null),
});

export function calculateBmi(heightCm: unknown, weightKg: unknown): number | null {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!Number.isFinite(height) || !Number.isFinite(weight) || height < 100 || height > 250 || weight <= 0 || weight > 500) return null;
  return weight / (height / 100) ** 2;
}

export function adultBmiEligible(dateOfBirth: string, today = new Date().toISOString().slice(0, 10)): boolean {
  if (!z.iso.date().safeParse(dateOfBirth).success || dateOfBirth > today) return false;
  const age = Number(today.slice(0, 4)) - Number(dateOfBirth.slice(0, 4)) - (today.slice(5) < dateOfBirth.slice(5) ? 1 : 0);
  return age >= 20;
}
