export type ProgramSlug = "consultation" | "diet-plan" | "workout-plan" | "personal-training";

// Matches the `services.type` column, so a program's real price can be looked
// up from the DB instead of hardcoded here.
export type ServiceType = "consultation" | "diet" | "workout" | "personal_training";

export type MarketingProgram = {
  slug: ProgramSlug;
  serviceType: ServiceType;
  number: string;
  name: string;
  shortName: string;
  eyebrow: string;
  summary: string;
  imageSrc: string;
  imageAlt: string;
  description: string;
  outcomes: string[];
  bestFor: string;
};

export const marketingNav = [
  { href: "/", label: "Home" },
  { href: "/programs", label: "Programs" },
  { href: "/about", label: "About" },
  { href: "/results", label: "Results" },
  { href: "/contact", label: "Contact" },
] as const;

export const programs: MarketingProgram[] = [
  {
    slug: "consultation",
    imageSrc: "/brand/coach-training-01.jpg",
    imageAlt: "Coach Ali in his training environment.",
    serviceType: "consultation",
    number: "01",
    name: "Consultation",
    shortName: "Start with clarity",
    eyebrow: "Assessment & direction",
    summary: "A focused conversation that turns your goals, schedule, and starting point into a clear next step.",
    description:
      "We look at what you want to change, what has stalled before, and what your week can realistically support. You leave knowing whether nutrition coaching, a training plan, or personal training is the right fit.",
    outcomes: ["Goal and readiness assessment", "Clear service recommendation", "A practical first-action plan"],
    bestFor: "Anyone who wants expert direction before committing to a longer program.",
  },
  {
    slug: "diet-plan",
    imageSrc: "/brand/fitness/nutrition.png",
    imageAlt: "A balanced bowl of chicken, rice, avocado, and vegetables.",
    serviceType: "diet",
    number: "02",
    name: "Meal plan",
    shortName: "Eat with structure",
    eyebrow: "Nutrition coaching",
    summary: "Custom calories, macros, meals, and swaps built around the way you actually live.",
    description:
      "Your plan starts with your preferences and routine, then gives you enough structure to make progress without turning every meal into a calculation. Weekly adherence gives the coach a real signal for the next adjustment.",
    outcomes: ["Personal calorie and macro targets", "Meal options with useful food swaps", "Ongoing adherence review"],
    bestFor: "Clients who need a repeatable nutrition system rather than another short-term diet.",
  },
  {
    slug: "workout-plan",
    imageSrc: "/brand/fitness/strength.png",
    imageAlt: "A woman performing a kettlebell squat in the gym.",
    serviceType: "workout",
    number: "03",
    name: "Workout plan",
    shortName: "Train with purpose",
    eyebrow: "Structured programming",
    summary: "A progressive weekly split with the exact sets, reps, effort, and exercise guidance you need.",
    description:
      "Every session has a purpose. The plan fits your available days, current ability, equipment, and goal, while completion tracking makes it easy to see where consistency or recovery needs attention.",
    outcomes: ["Goal-specific weekly split", "Sets, reps, RPE, and exercise guidance", "Completion and progression tracking"],
    bestFor: "Independent trainees who want expert programming and a clear progression path.",
  },
  {
    slug: "personal-training",
    imageSrc: "/brand/fitness/training.png",
    imageAlt: "A man and woman training with dumbbells.",
    serviceType: "personal_training",
    number: "04",
    name: "Personal training",
    shortName: "Coaching, up close",
    eyebrow: "One-to-one support",
    summary: "Direct coaching, session accountability, and progression matched to your lifestyle or performance goal.",
    description:
      "Personal training combines programming with live coaching and regular review. Choose the service style that fits your calendar, work demands, or athletic target while every session stays connected to the bigger plan.",
    outcomes: ["Coached sessions and attendance logs", "Technique and progression feedback", "A tier matched to your real constraints"],
    bestFor: "Clients who value closer support, faster feedback, and stronger accountability.",
  },
];

// `tier` matches the `services.tier` column so each card can be paired with its real price.
export const personalTrainingTiers = [
  {
    name: "Elite",
    tier: "elite",
    marker: "Priority",
    description: "Priority scheduling and close accountability for clients who want their training protected on a busy calendar.",
  },
  {
    name: "Business",
    tier: "business",
    marker: "Flexible",
    description: "Remote-friendly structure that adapts when travel, long days, and changing schedules are part of the week.",
  },
  {
    name: "Athlete",
    tier: "athlete",
    marker: "Performance",
    description: "Testing, periodization, and performance review built around a specific sport or competitive target.",
  },
] as const;

// Labels for the `packages.category` enum — kept in sync with PACKAGE_CATEGORIES
// in src/lib/package-tiers.ts (the source of truth for valid values).
export const packageCategoryLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  elite: "Elite",
  business: "Business",
  athlete: "Athlete",
};

export const coachingProcess = [
  {
    number: "01",
    title: "Understand the person",
    text: "Goals matter, but so do your work, food preferences, training history, equipment, recovery, and available time.",
  },
  {
    number: "02",
    title: "Build the right system",
    text: "The plan gives you clear actions for the week, with enough flexibility to survive real life.",
  },
  {
    number: "03",
    title: "Track what matters",
    text: "Completion, adherence, check-ins, and progression show what is working without reducing progress to one number.",
  },
  {
    number: "04",
    title: "Adjust with context",
    text: "Your coach reviews the signal, listens to the feedback, and changes the plan when the evidence calls for it.",
  },
] as const;

export const coachingPrinciples = [
  {
    number: "01",
    title: "Specific beats extreme",
    text: "The best plan is not the hardest one. It is the one that asks the right amount from you, consistently.",
  },
  {
    number: "02",
    title: "Progress needs context",
    text: "Weight, strength, adherence, sleep, confidence, and performance tell a fuller story when viewed together.",
  },
  {
    number: "03",
    title: "Coaching stays human",
    text: "Plans change because people and weeks change. Direct conversation remains part of the system.",
  },
] as const;

export const progressSignals = [
  {
    label: "Consistency",
    title: "The plan fits the week",
    text: "Sessions and meals happen often enough that progress no longer depends on a perfect day.",
  },
  {
    label: "Performance",
    title: "Training moves forward",
    text: "Reps feel cleaner, working loads improve, conditioning develops, and recovery becomes easier to read.",
  },
  {
    label: "Body metrics",
    title: "Trends replace guesswork",
    text: "Measurements, photos, and weight trends are reviewed over time instead of judged in isolation.",
  },
  {
    label: "Confidence",
    title: "You know what to do next",
    text: "A successful program leaves you with better judgment, not permanent dependence on motivation.",
  },
] as const;

export const resultJourney = [
  {
    phase: "Baseline",
    title: "Start with an honest picture",
    text: "Record the current routine, relevant measurements, training capacity, and the constraints that will shape the plan.",
  },
  {
    phase: "Build",
    title: "Create repeatable weeks",
    text: "Learn the movements, meals, and habits that deliver enough quality without exhausting your schedule.",
  },
  {
    phase: "Progress",
    title: "Raise the right demand",
    text: "Add challenge when technique, adherence, and recovery show you are ready—not because a calendar says so.",
  },
  {
    phase: "Sustain",
    title: "Keep the result usable",
    text: "Turn the strongest parts of the program into a system you can maintain through changing seasons of life.",
  },
] as const;
