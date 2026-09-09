import { z } from "zod";

const optionalNumber = (max: number) => z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().min(0).max(max).nullable());
export const transformationStorySchema = z.object({
  headline: z.string().trim().max(160).default(""),
  program: z.string().trim().max(120).default(""),
  durationWeeks: optionalNumber(520).refine((value) => value == null || (Number.isInteger(value) && value > 0), "Duration must be a positive number of weeks."),
  weightBefore: optionalNumber(500),
  weightAfter: optionalNumber(500),
  bodyFatBefore: optionalNumber(100),
  bodyFatAfter: optionalNumber(100),
  consent: z.boolean().default(false),
});
export type TransformationStory = z.infer<typeof transformationStorySchema>;

const photoUrl = z.union([z.literal(""), z.string().trim().url().max(500).refine((value) => value.startsWith("https://"), "Use an HTTPS photo URL.")]);
export const transformationSchema = z.object({
  displayName: z.string().trim().min(2, "Client name is required.").max(120),
  beforePhotoUrl: photoUrl,
  afterPhotoUrl: photoUrl,
  description: z.string().trim().max(2000),
  isPublished: z.boolean(),
  story: transformationStorySchema,
}).superRefine((value, context) => {
  if (value.isPublished && (!value.beforePhotoUrl || !value.afterPhotoUrl)) context.addIssue({ code: "custom", path: ["photos"], message: "Add both before and after photos before publishing." });
  if (value.isPublished && !value.story.consent) context.addIssue({ code: "custom", path: ["consent"], message: "Confirm permission to share this transformation before publishing." });
});

export function parseTransformationStory(value: unknown): TransformationStory {
  let input = value;
  if (typeof value === "string") {
    try { input = JSON.parse(value); } catch { input = {}; }
  }
  const result = transformationStorySchema.safeParse(input || {});
  return result.success ? result.data : transformationStorySchema.parse({});
}

export type TransformationRow = {
  id: number;
  displayName: string;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  description: string;
  isPublished: boolean;
  story: TransformationStory;
};
