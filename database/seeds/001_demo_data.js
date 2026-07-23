/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");

const PASSWORD = "sofitdemo";
const COACH_EMAIL = "coach@sofit.app";
const CLIENT_EMAIL = "client@sofit.app";

function dateAt(dayOffset, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function weekStart(weekOffset = 0) {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function upsertUser(trx, email, values) {
  const existing = await trx("users").select("id").where({ email }).first();
  if (existing) {
    await trx("users").where({ id: existing.id }).update(values);
    return Number(existing.id);
  }
  const [id] = await trx("users").insert({ email, ...values });
  return Number(id);
}

async function upsertService(trx, values) {
  const existing = await trx("services").select("id").where({ name: values.name }).first();
  if (existing) {
    await trx("services").where({ id: existing.id }).update(values);
    return Number(existing.id);
  }
  const [id] = await trx("services").insert(values);
  return Number(id);
}

async function upsertPackage(trx, values) {
  const existing = await trx("packages").select("id").where({ name: values.name }).first();
  if (existing) {
    await trx("packages").where({ id: existing.id }).update(values);
    return Number(existing.id);
  }
  const [id] = await trx("packages").insert(values);
  return Number(id);
}

async function upsertLibraryItem(trx, table, values) {
  const existing = await trx(table).select("id").where({ name: values.name }).first();
  if (existing) {
    await trx(table).where({ id: existing.id }).update(values);
    return Number(existing.id);
  }
  const [id] = await trx(table).insert(values);
  return Number(id);
}

/** @param {import("knex").Knex} knex */
exports.seed = async function seed(knex) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await knex.transaction(async (trx) => {
    const coachId = await upsertUser(trx, COACH_EMAIL, {
      name: "SoFit Coach",
      password_hash: passwordHash,
      role: "coach",
      approval_status: "approved",
      is_active: true,
    });

    const clientUserId = await upsertUser(trx, CLIENT_EMAIL, {
      name: "Amina Hassan",
      password_hash: passwordHash,
      role: "client",
      approval_status: "approved",
      is_active: true,
    });

    const serviceIds = {};
    const services = [
      {
        key: "consultation",
        name: "Consultation",
        type: "consultation",
        tier: null,
        price: 60,
        billing_interval: "one_time",
        description: "A focused intake call, goal review, and fitness assessment.",
        is_active: true,
      },
      {
        key: "diet",
        name: "Diet Plan",
        type: "diet",
        tier: null,
        price: 120,
        billing_interval: "monthly",
        description: "Custom calories, macros, meals, and practical food swaps.",
        is_active: true,
      },
      {
        key: "workout",
        name: "Workout Plan",
        type: "workout",
        tier: null,
        price: 140,
        billing_interval: "monthly",
        description: "A progressive training program with sets, reps, RPE, and tracking.",
        is_active: true,
      },
      {
        key: "elite",
        name: "Elite Personal Training",
        type: "personal_training",
        tier: "elite",
        price: 400,
        billing_interval: "monthly",
        description: "Priority scheduling, weekly sessions, diet, and workout coaching.",
        is_active: true,
      },
      {
        key: "business",
        name: "Business Personal Training",
        type: "personal_training",
        tier: "business",
        price: 260,
        billing_interval: "monthly",
        description: "Flexible remote-first coaching designed around a busy schedule.",
        is_active: true,
      },
      {
        key: "athlete",
        name: "Athlete Personal Training",
        type: "personal_training",
        tier: "athlete",
        price: 520,
        billing_interval: "monthly",
        description: "Performance testing, periodization, and competition preparation.",
        is_active: true,
      },
    ];

    for (const { key, ...service } of services) {
      serviceIds[key] = await upsertService(trx, service);
    }

    const packageIds = {};
    const packages = [
      {
        key: "beginner",
        name: "Beginner Kickstart",
        category: "beginner",
        price: 99,
        billing_interval: "monthly",
        description: "A simple starting package with assessment and a guided training plan.",
        services: [
          { service_id: serviceIds.consultation, quantity: 1 },
          { service_id: serviceIds.workout, quantity: 1 },
        ],
      },
      {
        key: "intermediate",
        name: "Intermediate Progress",
        category: "intermediate",
        price: 199,
        billing_interval: "monthly",
        description: "Structured nutrition and training for clients ready to progress consistently.",
        services: [
          { service_id: serviceIds.consultation, quantity: 1 },
          { service_id: serviceIds.diet, quantity: 1 },
          { service_id: serviceIds.workout, quantity: 1 },
        ],
      },
      {
        key: "elite",
        name: "Elite Complete",
        category: "elite",
        price: 400,
        billing_interval: "monthly",
        description: "Complete coaching with diet, workouts, and priority personal training.",
        services: [
          { service_id: serviceIds.diet, quantity: 1 },
          { service_id: serviceIds.workout, quantity: 1 },
          { service_id: serviceIds.elite, quantity: 4 },
        ],
      },
      {
        key: "business",
        name: "Business Flex",
        category: "business",
        price: 260,
        billing_interval: "monthly",
        description: "Flexible remote coaching for clients with demanding work schedules.",
        services: [
          { service_id: serviceIds.diet, quantity: 1 },
          { service_id: serviceIds.workout, quantity: 1 },
          { service_id: serviceIds.business, quantity: 2 },
        ],
      },
      {
        key: "athlete",
        name: "Athlete Performance",
        category: "athlete",
        price: 520,
        billing_interval: "monthly",
        description: "Performance coaching with testing, periodization, nutrition, and athlete PT.",
        services: [
          { service_id: serviceIds.diet, quantity: 1 },
          { service_id: serviceIds.workout, quantity: 1 },
          { service_id: serviceIds.athlete, quantity: 4 },
        ],
      },
    ];

    for (const { key, services: packageServices, ...packageRecord } of packages) {
      const packageId = await upsertPackage(trx, { ...packageRecord, is_active: true });
      packageIds[key] = packageId;
      await trx("package_services").where({ package_id: packageId }).del();
      await trx("package_services").insert(
        packageServices.map((includedService) => ({ package_id: packageId, ...includedService })),
      );
    }

    const mealLibrary = [
      { name: "Egg and avocado breakfast", meal_type: "breakfast", calories: 510, protein_g: 28, carbs_g: 42, fat_g: 25, ingredients: "3 eggs\n2 slices whole-grain bread\n1/2 avocado\n1 banana", instructions: "Cook the eggs to preference and serve with toast, avocado, and banana." },
      { name: "Oats and yogurt bowl", meal_type: "breakfast", calories: 440, protein_g: 27, carbs_g: 61, fat_g: 10, ingredients: "60g oats\n200g Greek yogurt\nberries\n10g honey", instructions: "Combine in a bowl. Prepare overnight if preferred." },
      { name: "Chicken rice bowl", meal_type: "lunch", calories: 640, protein_g: 52, carbs_g: 72, fat_g: 14, ingredients: "150g chicken breast\n200g cooked rice\nmixed vegetables\nolive oil", instructions: "Grill the chicken, cook the rice, and serve with vegetables." },
      { name: "Tuna pasta salad", meal_type: "lunch", calories: 590, protein_g: 43, carbs_g: 70, fat_g: 14, ingredients: "1 can tuna\n180g cooked pasta\nsalad vegetables\nyogurt dressing", instructions: "Mix all ingredients and keep chilled." },
      { name: "Fish and potatoes", meal_type: "dinner", calories: 570, protein_g: 45, carbs_g: 58, fat_g: 17, ingredients: "150g fish\n250g potatoes\ngreen salad\nolive oil", instructions: "Bake the fish and potatoes; serve with salad." },
      { name: "Yogurt fruit snack", meal_type: "snack", calories: 260, protein_g: 20, carbs_g: 28, fat_g: 8, ingredients: "200g Greek yogurt\n1 fruit\n15g almonds", instructions: "Serve together as a quick snack." },
    ];
    for (const meal of mealLibrary) await upsertLibraryItem(trx, "meal_library", { ...meal, is_active: true });

    const exerciseLibrary = [
      { name: "Bodyweight squat", muscle_group: "Legs", equipment: "Bodyweight", difficulty: "beginner", motion_type: "squat", instructions: "Keep the chest tall, knees tracking over toes, and control the full range." },
      { name: "Goblet squat", muscle_group: "Legs", equipment: "Dumbbell", difficulty: "beginner", motion_type: "squat", instructions: "Hold the weight close to the chest and brace before descending." },
      { name: "Romanian deadlift", muscle_group: "Hamstrings", equipment: "Barbell", difficulty: "intermediate", motion_type: "hinge", instructions: "Push the hips back while keeping the spine neutral and the bar close." },
      { name: "Push-up", muscle_group: "Chest", equipment: "Bodyweight", difficulty: "beginner", motion_type: "push", instructions: "Maintain a straight body line and lower the chest under control." },
      { name: "Cable row", muscle_group: "Back", equipment: "Cable", difficulty: "beginner", motion_type: "pull", instructions: "Pull the elbows back without shrugging and pause at the torso." },
      { name: "Walking lunge", muscle_group: "Legs", equipment: "Bodyweight", difficulty: "intermediate", motion_type: "lunge", instructions: "Take a stable step and lower the back knee under control." },
      { name: "Dumbbell curl", muscle_group: "Biceps", equipment: "Dumbbells", difficulty: "beginner", motion_type: "curl", instructions: "Keep elbows still and avoid swinging the torso." },
      { name: "Overhead press", muscle_group: "Shoulders", equipment: "Barbell", difficulty: "intermediate", motion_type: "press", instructions: "Brace the trunk and press overhead without leaning back." },
    ];
    for (const exercise of exerciseLibrary) await upsertLibraryItem(trx, "exercise_library", { ...exercise, media_url: null, is_active: true });

    let client = await trx("clients").select("id").where({ user_id: clientUserId }).first();
    const clientValues = {
      service_id: serviceIds.elite,
      package_id: packageIds.elite,
      status: "active",
      pipeline_stage: "active",
      phone: "+252 61 555 0101",
      date_of_birth: "1997-05-14",
      goals: "Build strength, improve body composition, and follow a consistent meal routine.",
      medical_notes: "No current injuries. Cleared for normal strength training.",
      joined_at: dateAt(-90),
    };

    if (client) {
      await trx("clients").where({ id: client.id }).update(clientValues);
    } else {
      const [clientId] = await trx("clients").insert({ user_id: clientUserId, ...clientValues });
      client = { id: clientId };
    }
    const clientId = Number(client.id);

    await trx("messages")
      .where({ sender_id: clientUserId })
      .orWhere({ recipient_id: clientUserId })
      .del();
    for (const table of ["invoices", "check_ins", "sessions", "workout_plans", "diet_plans", "consultations"]) {
      await trx(table).where({ client_id: clientId }).del();
    }
    await trx("invites").where({ email: CLIENT_EMAIL }).del();

    await trx("consultations").insert([
      {
        client_id: clientId,
        starts_at: dateAt(-30, 10),
        duration_minutes: 60,
        status: "completed",
        intake_answers: JSON.stringify({
          primary_goal: "Strength and healthy body composition",
          experience: "Intermediate",
          availability: "Four training days per week",
        }),
        session_notes: "Client is ready for structured nutrition and progressive strength training.",
        converted_service_id: serviceIds.elite,
      },
      {
        client_id: clientId,
        starts_at: dateAt(7, 11),
        duration_minutes: 45,
        status: "scheduled",
        intake_answers: JSON.stringify({ purpose: "Monthly plan review" }),
        session_notes: null,
        converted_service_id: null,
      },
    ]);

    await trx("diet_plans").insert({
      client_id: clientId,
      title: "Balanced Strength Nutrition",
      version: 1,
      daily_calories: 2200,
      protein_g: 150,
      carbs_g: 245,
      fat_g: 70,
      meals: JSON.stringify([
        {
          type: "breakfast",
          name: "Breakfast",
          time: "08:00",
          calories: 510,
          items: ["3 eggs", "2 slices whole-grain bread", "1 banana"],
        },
        {
          type: "lunch",
          name: "Lunch",
          time: "13:00",
          calories: 640,
          items: ["150g chicken breast", "200g rice", "mixed vegetables"],
        },
        {
          type: "snack",
          name: "Snack",
          time: "16:30",
          calories: 260,
          items: ["Greek yogurt", "berries", "15g almonds"],
        },
        {
          type: "dinner",
          name: "Dinner",
          time: "20:00",
          calories: 570,
          items: ["150g fish", "250g potatoes", "green salad"],
        },
      ]),
      food_swaps: JSON.stringify([
        { replace: "Chicken breast", with: ["Lean beef", "Tuna", "Lentils"] },
        { replace: "Rice", with: ["Pasta", "Potatoes", "Canjeero portion"] },
        { replace: "Greek yogurt", with: ["Milk", "Protein shake", "Cottage cheese"] },
      ]),
      status: "active",
      starts_on: dateAt(-14),
    });

    await trx("workout_plans").insert({
      client_id: clientId,
      title: "Strength Foundation - Phase 1",
      version: 1,
      weeks: 6,
      weekly_split: JSON.stringify([
        "Monday - Lower body",
        "Tuesday - Upper body",
        "Thursday - Lower body",
        "Saturday - Upper body",
      ]),
      exercises: JSON.stringify([
        { day: "Lower A", exercise: "Back squat", muscle_group: "Legs", motion_type: "squat", sets: 4, reps: "6", rpe: 7, rest_seconds: 120 },
        { day: "Lower A", exercise: "Romanian deadlift", muscle_group: "Hamstrings", motion_type: "hinge", sets: 3, reps: "8", rpe: 7, rest_seconds: 120 },
        { day: "Upper A", exercise: "Bench press", muscle_group: "Chest", motion_type: "push", sets: 4, reps: "6", rpe: 7, rest_seconds: 120 },
        { day: "Upper A", exercise: "Cable row", muscle_group: "Back", motion_type: "pull", sets: 3, reps: "10", rpe: 8, rest_seconds: 90 },
        { day: "Lower B", exercise: "Deadlift", muscle_group: "Posterior chain", motion_type: "hinge", sets: 3, reps: "5", rpe: 7, rest_seconds: 150 },
        { day: "Lower B", exercise: "Walking lunge", muscle_group: "Legs", motion_type: "lunge", sets: 3, reps: "10", rpe: 8, rest_seconds: 90 },
        { day: "Upper B", exercise: "Overhead press", muscle_group: "Shoulders", motion_type: "press", sets: 4, reps: "8", rpe: 7, rest_seconds: 90 },
        { day: "Upper B", exercise: "Lat pulldown", muscle_group: "Back", motion_type: "pull", sets: 3, reps: "10", rpe: 8, rest_seconds: 90 },
      ]),
      status: "active",
      starts_on: dateAt(-14),
    });

    await trx("sessions").insert([
      {
        client_id: clientId,
        service_id: serviceIds.elite,
        starts_at: dateAt(-7, 10),
        duration_minutes: 60,
        attendance: "attended",
        notes: "Completed all working sets. Squat technique improved.",
        progression_metrics: JSON.stringify({ squat_kg: 60, bench_kg: 40, rpe: 7 }),
        performance_tests: null,
      },
      {
        client_id: clientId,
        service_id: serviceIds.elite,
        starts_at: dateAt(2, 10),
        duration_minutes: 60,
        attendance: "scheduled",
        notes: "Upper-body strength session.",
        progression_metrics: JSON.stringify({ target_rpe: 8 }),
        performance_tests: null,
      },
    ]);

    await trx("check_ins").insert([
      {
        client_id: clientId,
        week_of: weekStart(-1),
        weight_kg: 69.4,
        diet_adherence_pct: 82,
        workout_completion_pct: 75,
        energy_score: 7,
        sleep_score: 7,
        client_notes: "Good first week. Meal preparation was the main challenge.",
        coach_feedback: "Keep breakfast simple and prepare lunch portions in advance.",
        status: "reviewed",
      },
      {
        client_id: clientId,
        week_of: weekStart(0),
        weight_kg: 68.9,
        diet_adherence_pct: 90,
        workout_completion_pct: 100,
        energy_score: 8,
        sleep_score: 8,
        client_notes: "Training felt strong and meal preparation was easier.",
        coach_feedback: null,
        status: "submitted",
      },
    ]);

    await trx("invoices").insert([
      {
        client_id: clientId,
        service_id: serviceIds.elite,
        number: "SOF-DEMO-001",
        amount: 400,
        currency: "USD",
        status: "paid",
        due_on: dateAt(-30),
        paid_at: dateAt(-30, 9),
      },
      {
        client_id: clientId,
        service_id: serviceIds.elite,
        number: "SOF-DEMO-002",
        amount: 400,
        currency: "USD",
        status: "unpaid",
        due_on: dateAt(7),
        paid_at: null,
      },
    ]);

    await trx("messages").insert([
      {
        sender_id: coachId,
        recipient_id: clientUserId,
        body: "Welcome to SoFit. Your diet and workout plans are now active.",
        read_at: dateAt(-2, 9, 30),
        created_at: dateAt(-2, 9),
        updated_at: dateAt(-2, 9),
      },
      {
        sender_id: clientUserId,
        recipient_id: coachId,
        body: "Thank you. I completed all four workouts this week.",
        read_at: dateAt(-1, 18, 30),
        created_at: dateAt(-1, 18),
        updated_at: dateAt(-1, 18),
      },
      {
        sender_id: coachId,
        recipient_id: clientUserId,
        body: "Excellent work. Keep the next session around RPE 7 to 8.",
        read_at: null,
        created_at: dateAt(0, 8),
        updated_at: dateAt(0, 8),
      },
    ]);
  });
};
