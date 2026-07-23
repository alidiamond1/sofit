<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.




SoFit — System Build Prompt
Build a minimalistic online fitness coaching platform called SoFit. It manages four services (Consultation, Diet Plan, Workout Plan, Personal Training) and has two portals: a Coach Dashboard and a Client Dashboard. Design should be clean, modern, and minimal — lots of white space, one accent color, no clutter.
Business Context
SoFit is a solo fitness coaching business offering:

1. Consultation — intake calls and assessments
2. Diet Plan — custom nutrition plans
3. Workout Plan — custom training programs
4. Personal Training — three tiers: Elite, Business, and Athlete

Tech Requirements

* Responsive (mobile-first — clients mostly use phones)
* Role-based access: Coach (admin) vs Client
* Clean component-based UI, minimalist design system
* Secure auth, file upload/download (PDFs, photos), in-app messaging

COACH DASHBOARD
Home / Overview

* Today's schedule (consultations + PT sessions)
* Active client count + monthly revenue
* Pending tasks: plans to deliver, check-ins to review, unpaid invoices
* Quick actions: Add Client · Log Session · Send Plan

Menus:

* Clients — list, profiles, status (Active/Paused/Churned), assigned service tier, pipeline stage (Lead → Onboarding → Active → Renewal)
* Services — the 4 offerings + PT sub-tiers (Elite/Business/Athlete) with pricing
* Consultations — booking calendar, intake forms, session notes, convert-to-plan action
* Diet Plans — plan builder + library, macro/calorie targets, meal library, food swaps, assign to client, version history, PDF export
* Workout Plans — exercise library (with video links), program builder (sets/reps/RPE, weekly split), assign & schedule, completion tracking
* Personal Training — session logs, attendance, progression metrics, tier-specific views (Elite = priority scheduling; Business = flexible/remote; Athlete = performance testing + periodization)
* Check-ins — weekly client submissions (weight, photos, adherence) + coach feedback
* Payments — invoices, subscriptions, payment status
* Messages — client chat inbox
* Analytics — revenue, retention, client progress, service performance
* Settings — availability, intake forms, plan templates, branding

CLIENT DASHBOARD
Home

* Current program summary (service tier they're on)
* Next session / next check-in due
* Today's workout & meal plan
* Progress snapshot (weight trend, adherence streak)

Menus:

* My Plans — diet + workout, viewable and downloadable
* My Sessions — PT bookings & history
* Check-in — submit weekly stats + progress photos
* Progress — charts, measurements, photo timeline
* Messages — chat with coach
* Payments — subscription & invoice status
* Profile — goals, personal info

Service-Specific Logic

* Each service has its own status pipeline (Lead → Onboarding → Active → Renewal)
* Consultation outcomes can convert directly into a Diet/Workout plan or PT tier
* Diet plans track adherence; Workout plans track completion %
* Each PT tier shows different fields based on tier type

Design Direction
Minimal, calm, premium feel. Rounded cards, soft shadows, one accent color (suggest a fresh green or deep blue to fit "SoFit"). Clear typography hierarchy. No unnecessary features — every screen earns its place.
Deliverables: Coach Dashboard, Client Dashboard, all menus above, authentication, and a shared design system.
Want me to also generate a visual mockup of the SoFit dashboards so you can see the layout before building? I can also tailor this prompt for a specific tool (Lovable, Bolt, Figma, or a full-stack framework) — just tell me which one you'll use.
<!-- END:nextjs-agent-rules -->
