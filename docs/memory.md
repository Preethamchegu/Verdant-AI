# Project Memory

Current Phase

Hackathon Build — Day 1 (16–19 Jul window, treated as a single focused build day)

---

Completed

Project idea

Problem statement

Vision

Core architecture

Technology selection

Documentation

Doc review + hackathon re-scoping (this pass)

Block 1 (Repo setup, database schema with SQLModel, Next.js frontend and FastAPI backend skeleton)

Block 2 (JWT authentication signup/login backend API, React AuthContext, Landing Page value prop, Dashboard protected shell)

Block 3 (Gemini 2.5 Flash species classification integration, top-2 guesses confidence-gap calibration logic, protected plant registration backend endpoints, frontend new plant form and dashboard cards grid)

Block 4 (PlantVillage 14MB MobileNetV2 leaf disease classification integration on HF Inference API, database scan history persistence, dynamic health score updates, structured organic treatment planner, and frontend plant details timeline logs page)

---

Current Task

Block 5 — Care Planner + Health Score (Hr 6–8)

---

Next Task

Integrate OpenWeather API into care planning algorithm

Dynamically generate watering and misting reminders based on indoor vs outdoor weather logs

Build cron job scheduling framework for push notifications or local reminders

Update user dashboard with notifications/reminders view

Block 6 — Carbon Estimator + Maps (Hr 8–10)

---

Known Risks

Large AI model size

Dataset quality

Weather API dependency

Expert database availability

1-day time budget — now the highest risk item; scope creep is the real threat, not technical difficulty

---

Future Improvements

Offline AI

IoT soil sensors

Drone monitoring

Government integrations

Satellite vegetation monitoring

---

## History Log

**[Original]** Current Task was "Designing UI wireframes." Next Tasks were Authentication, Project initialization, Database schema.

**[This update]** Reviewed all 6 docs. Found: design.md and phases.md were duplicate files; Prisma was listed alongside FastAPI (mismatched stack — Prisma's Python support isn't FastAPI-native); the architecture diagram was drawn as a false linear dependency chain (Notifications → Weather → Maps) instead of hub-and-spoke off the Backend API; the AI Engine's 6 listed capabilities weren't mapped to the 4-folder `ai/` structure (they do map cleanly, just wasn't documented); the full 8-phase roadmap had no Day-1-vs-later split for the actual hackathon window, which risked spreading 1 day of effort across months of scope. Rescoped to a Day 1 MVP (species ID + disease detection + treatment/care planner + health score + carbon estimate, all with real AI calls) with everything else moved to a clearly labeled Post-Hackathon Roadmap. Formal wireframing dropped in favor of a lightweight design system doc (see design.md) to fit the time budget.

**[Deployment planning update]** Locked deployment topology: Vercel (frontend) + Railway (backend/Postgres) + Hugging Face Serverless Inference API (models) — see architecture.md and rules.md. Chose the HF Inference API over self-hosting a Space specifically to avoid GPU/model-management overhead on Day 1. Added deploy-early guidance to phases.md (Block 1 now includes a "hello world" skeleton deploy, not just local setup) plus a dedicated live-verification block before demo recording, since a cold-start or CORS failure caught at hour 11 is unrecoverable. Flagged that account/API-token creation (GitHub, Vercel, Railway, Hugging Face) is human-only pre-work — an agent can't complete OAuth/email verification steps.

**[Block 1 Complete]** Scaffolding completed. Backend initialized with FastAPI, SQLModel schema, and SQLite local database fallback. Created all required models for Users, Plants, PlantImages, DiseaseHistory, HealthScores, Reminders, Treatments, and placeholder models. Frontend scaffolded with Next.js App Router and styled with Vanilla CSS matching the Clean & Green theme. End-to-end local integration verified.

**[Block 2 Complete]** JWT-based email/password authentication system completed. Solved a `passlib` compatibility bug with newer `bcrypt` versions by implementing password hashing using python `bcrypt` library directly. Set up user signup and login backend APIs. Programmed client-side `AuthProvider` for token storage and session persistence, an interactive login/signup card screen, a branded Landing Page, and a protected Dashboard Shell displaying honest 0 metrics and a dark mode toggle.

**[Block 3 Model Selection Decision]** Due to active regional 504 Gateway Timeout errors on Hugging Face Serverless Inference during model mapping checks, locked the decision to use **Gemini 2.5 Flash** (via the Google Gemini API) for species identification. We will pass a multimodal prompt to Gemini requesting its top-2 guesses and relative confidence scores. To manage the uncalibrated nature of generative confidence, we will compute the gap between the top two guesses. A narrow gap (e.g., < 20% difference) will dynamically reduce the reported confidence score, ensuring it triggers the 70% rules.md expert-escalation flag if the model is uncertain. For Block 4, we will test the connectivity of the lightweight (~14MB) PlantVillage-trained model `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification` on HF Inference API before committing to it.

**[Block 4 Complete]** Completed plant disease detection and treatment planner. Verified connectivity to the 14MB model `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification` on the Hugging Face router, resolving responses in <1s. Programmed a static treatment lookup mapping the 38 classes to descriptions and organic/chemical care steps. Added `POST /plants/{plant_id}/diagnose` (inserts logs into `DiseaseHistory` and updates `HealthScore`), `GET /plants/{plant_id}`, and `GET /plants/{plant_id}/history` (timeline logs). Built the frontend profile details view at `frontend/app/plants/[id]` presenting current health rings, status badges with icons, diagnostic scans, step-by-step treatment cards, and historical event timelines.

**[Block 3 Local Integration & Error Resolution]** Encountered and resolved several critical blockades during Block 3:
1. *ModuleNotFoundError (sqlmodel) on Windows reload*: Reloader spawned subprocesses using system global Python instead of virtualenv. Solved by running server with `reload=False`.
2. *Router prefix missing in FastAPI 0.139.0*: Fixed by reorganizing route imports at the bottom of `main.py` after CORS middleware initialization.
3. *Port 8000 TIME_WAIT block*: Lingering Windows socket states locked port 8000. Reconfigured both frontend and backend to run on port `8001`.
4. *Gemini 2.5 Flash Deprecation*: Legacy model threw a 404 for new users. Updated model code to use `gemini-3.5-flash`.
5. *Casing mismatch on result*: Frontend requested `result.aiDetails` (camelCase) but FastAPI returned `result.ai_details` (snake_case). Implemented a fallback `result.aiDetails || result.ai_details` in `new/page.tsx`.
6. *Gemini API response truncation*: The model output was cut off mid-sentence because `maxOutputTokens` was not specified in `generationConfig`, causing JSON parsing errors. Solved by setting `maxOutputTokens: 2048` and `temperature: 0.2`.
7. *Gemini 429 Quota Exhaustion*: The free-tier user limits for `gemini-3.5-flash` are extremely low (only 20 requests per day). Users hit `429 Resource Exhausted` error. Resolved by restructuring the backend fallback models to prioritize `gemini-3.1-flash-lite` (which offers a much higher limit of 500 requests per day) and adding a 5-second automatic retry backoff.
8. *Hugging Face Disease Model Verification*: Verified the Hugging Face `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification` model scanner locally. Configured it to fetch and encode images properly, handle predictions, correctly map labels (e.g. "Bacterial Spot" on a test Monstera leaf scan), and successfully flag low-confidence predictions (< 70%) for botanical expert review.


**[Block 5 Complete]** Developed the core care reminders scheduler with a rule-based engine (`planner.py`) driven by species, season, and real-time/fallback weather logic (`weather.py`). Set up overdue penalty recalculation routines inside `check_and_apply_care_penalties` (bypassing automated adjustment loops to prevent score fluctuations). Implemented dashboard tasks list and details page checklists with completion safety rules.

**[Block 6 Complete]** Created mathematical carbon absorption (CO2 kg) and water conservation (liters saved) calculations tied to plant species and weather reminder intervals deviation. Added endpoints `/plants/impact/summary` and `/plants/{plant_id}/impact`. Updated frontend navbar layout with real-time temperature/humidity weather stats, removed email labels, restructured the dashboard stats metrics into a premium 4-column cards grid, and added local expert search geolocated on Google Maps.

---

Update Rule

Update this document after every completed milestone.

Never remove history.

Always append progress.