export type IntakeField = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "choice";
  options?: string[];
};

export type IntakeSection = {
  id: string;
  title: string;
  subtitle: string;
  fields: IntakeField[];
};

export const intakeSections: IntakeSection[] = [
  {
    id: "about-you",
    title: "Tell us about you",
    subtitle: "Wax iiga sheeg macluumaadka kugu saabsan",
    fields: [
      { name: "full_name", label: "Full name ? Magacaaga oo dhamaystiran" },
      { name: "age", label: "Age ? Da''daada", type: "number" },
      { name: "height", label: "Height ? Dhererkaaga" },
      { name: "weight", label: "Weight ? Miisaankaaga" },
      { name: "body_change", label: "Do you want to see changes in your body weight or composition? ? Ma doonaysaa isbeddel miisaan ama qaabka jirka?", type: "textarea" },
      { name: "desired_changes", label: "Describe the changes you would like to see ? Sharax isbeddellada aad rabto", type: "textarea" },
      { name: "goals", label: "What are your health, lifestyle, and dietary goals? ? Maxay yihiin hadafyada caafimaadka iyo qaab nololeedkaaga?", type: "textarea" },
      { name: "followed_diet", label: "Have you ever followed a diet? ? Waligaa ma raacday qorshe cunto?", type: "choice", options: ["Yes ? Haa", "No ? Maya"] },
      { name: "coach_expectations", label: "What do you hope to achieve by working with your coach? ? Maxaad ka filaysaa coach-kaaga?", type: "textarea" },
    ],
  },
  {
    id: "lifestyle",
    title: "Your current lifestyle",
    subtitle: "Wax iiga sheeg qaab nololeedkaaga",
    fields: [
      { name: "sleep_hours", label: "How many hours do you sleep? ? Immisa saacadood ayaad seexataa?", type: "choice", options: ["Less than 5 hours", "5?7 hours", "Around 8 hours", "More than 8 hours"] },
      { name: "exercise_regularly", label: "Do you exercise regularly? ? Si joogto ah ma u jimicsataa?", type: "choice", options: ["Yes ? Haa", "No ? Maya"] },
      { name: "exercise_details", label: "How often and what type of exercise? ? Jimicsi noocee ah ayaad samaysaa?", type: "textarea" },
      { name: "diet_healthy", label: "Do you feel your current diet is healthy? ? Ma dareemaysaa cuntadaadu inay caafimaad qabto?", type: "textarea" },
      { name: "diet_lacking", label: "What do you think your current diet is lacking? ? Maxaa ka maqan cuntadaada hadda?", type: "textarea" },
      { name: "digestive_issues", label: "Do you have any digestive issues? ? Ma leedahay dhibaato dheefshiid?", type: "textarea" },
      { name: "digestive_details", label: "What kind and how often? ? Waa noocee, imisa jeer ayayna dhacdaa?", type: "textarea" },
      { name: "energy_rating", label: "Rate your average daily energy from 1 to 10 ? Ku qiimee tamartaada 1 ilaa 10", type: "choice", options: ["1","2","3","4","5","6","7","8","9","10"] },
    ],
  },
  {
    id: "current-diet",
    title: "Your current diet",
    subtitle: "Wax iiga sheeg cuntadaada hadda",
    fields: [
      { name: "meals_per_day", label: "How many times do you eat per day? ? Meeqa mar ayaad wax cuntaa maalintii?" },
      { name: "breakfast", label: "Describe your typical breakfast ? Sharax quraacdaada", type: "textarea" },
      { name: "breakfast_time", label: "What time do you eat breakfast? ? Wakhtigee ayaad quraacataa?" },
      { name: "lunch", label: "Describe your typical lunch ? Sharax qadadaada", type: "textarea" },
      { name: "lunch_time", label: "What time do you eat lunch? ? Wakhtigee ayaad qadeysaa?" },
      { name: "dinner", label: "Describe your typical dinner ? Sharax cashadaada", type: "textarea" },
      { name: "dinner_time", label: "What time do you eat dinner? ? Wakhtigee ayaad cashaysaa?" },
      { name: "snacks", label: "Describe your typical snacks ? Sharax cuntooyinkaaga fudud", type: "textarea" },
      { name: "snack_times", label: "What times do you eat snacks? ? Wakhtiyadee ayaad cuntaa cuntooyinka fudud?" },
      { name: "meals_out", label: "How many meals per week do you eat out? ? Imisa jeer ayaad bannaanka ka cuntaa usbuucii?", type: "choice", options: ["None ? Maya", "1?2 times", "3?4 times", "4 or more"] },
      { name: "common_meal_out", label: "If you eat out, what meal do you most often choose? ? Cuntooyinkee ayaad badanaa bannaanka ka cuntaa?", type: "textarea" },
    ],
  },
  {
    id: "meal-planning",
    title: "Meal planning",
    subtitle: "Hadda aan ka hadalno qorshaynta cuntada",
    fields: [
      { name: "meal_plan_motivation", label: "What motivates you to seek a meal plan? ? Maxaa kugu dhiirrigeliyay qorshe cunto?", type: "textarea" },
      { name: "food_restrictions", label: "Foods you avoid due to allergies, sensitivities, culture, or religion ? Cuntooyin aadan u cuni karin caafimaad, dhaqan, ama diin awgeed", type: "textarea" },
      { name: "kitchen_time", label: "How much time would you ideally spend in the kitchen each day? ? Waqti intee le''eg ayaad rabtaa jikada?" },
      { name: "prep_style", label: "Which food-prep style best describes you? ? Qaabkee diyaarinta cuntada ayaa kuu fiican?", type: "choice", options: ["Prep in advance and repeat meals for a few days", "Cook different meals each day", "A mix of both", "Other"] },
      { name: "favourite_foods", label: "What are some of your favourite foods? ? Waa maxay cuntooyinka aad ugu jeceshahay?", type: "textarea" },
      { name: "meal_plan_concerns", label: "Does anything worry you about following a meal plan? ? Ma jiraan wax kaa cabsiinaya raacitaanka qorshe cunto?", type: "textarea" },
      { name: "anything_else", label: "Anything else that would help us build your plan? ? Ma jiraan wax kale oo naga caawinaya dhisidda qorshahaaga?", type: "textarea" },
    ],
  },
];

export const intakeFields = intakeSections.flatMap((section) => section.fields);

