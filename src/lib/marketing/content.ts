export type ProgramSlug = "consultation" | "diet-plan" | "workout-plan" | "personal-training";

export type MarketingProgram = {
  slug: ProgramSlug;
  number: string;
  name: string;
  shortName: string;
  eyebrow: string;
  summary: string;
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
    number: "02",
    name: "Diet plan",
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

export const personalTrainingTiers = [
  {
    name: "Elite",
    marker: "Priority",
    description: "Priority scheduling and close accountability for clients who want their training protected on a busy calendar.",
  },
  {
    name: "Business",
    marker: "Flexible",
    description: "Remote-friendly structure that adapts when travel, long days, and changing schedules are part of the week.",
  },
  {
    name: "Athlete",
    marker: "Performance",
    description: "Testing, periodization, and performance review built around a specific sport or competitive target.",
  },
] as const;

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
