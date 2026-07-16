# Development Rules

## AI must be central.

Never add AI as decoration.

Every recommendation should have reasoning.

---

## Tech Stack

Next.js

FastAPI

Python

PostgreSQL

SQLAlchemy / SQLModel + Alembic (migrations)

OpenAI

Gemini

TensorFlow

ONNX

Leaf Classification Models

PlantVillage Dataset

*(Changed from Prisma → SQLAlchemy/SQLModel: Prisma's Python client is community-maintained, not FastAPI-native, and is a common source of avoidable debugging time in a time-boxed build. SQLAlchemy/SQLModel + Alembic is the standard, better-supported pairing for FastAPI.)*

---

## Day 1 Build Pragmatism

One day is the real constraint here, not skill. To stay honest with "AI must be central" while staying shippable:

- **Species ID + Disease Detection** — must be a real pretrained model/API call, no mocked outputs. This is the non-negotiable core AI claim; everything else can flex, this can't.
- **Care Planner / Reminders** — a rule engine driven directly by the AI's own output (species, detected condition, weather). The reasoning is real and inspectable even though the ruleset itself isn't a trained model yet. Say that plainly in the demo — call it "adaptive ML" only once it actually is one (Roadmap).
- **Anything needing data that can't exist yet on Day 1** (weeks of growth photos, many nearby users, a hand-curated expert directory) is out of scope for the demo — see phases.md Post-Hackathon Roadmap. Don't fake this data to simulate depth; say what's real and what's next. Judges (and users) trust honest scoping more than a wide feature list that's secretly hollow.

---

## Deployment

Frontend → Vercel. Backend (FastAPI) + PostgreSQL → Railway. AI inference → Hugging Face Serverless Inference API (call it from the backend — do not self-host a Space or download model weights locally; this needs no GPU management and keeps Day 1 simple).

Pre-work that's on the human, not the agent — accounts and keys need email/OAuth verification the agent can't do:
1. GitHub account with an empty repo created
2. Vercel account, signed in via GitHub
3. Railway account, signed in via GitHub (check current trial terms at signup — card requirements have changed before)
4. Hugging Face account + an Inference API token generated (Settings → Access Tokens)

Required env vars (set in the Vercel/Railway dashboards — never commit secrets to the repo): `DATABASE_URL` (auto-provided by Railway's Postgres add-on), `HF_API_TOKEN`, `JWT_SECRET`, `CORS_ORIGINS` (the live Vercel frontend URL, added after the frontend is first deployed).

Image storage: Railway's filesystem is not guaranteed persistent across redeploys. Store plant photos as bytea/base64 in Postgres for Day 1 rather than standing up a separate object-storage service — one less thing to configure and one less thing that can break before the deadline.

---

## Avoid

Hardcoded recommendations

Random reminder intervals

Generic Google-like answers

Fake AI

Overcomplicated UI

Medical-style unsupported advice

---

## Error Handling

Every AI prediction must include

Confidence Score

Confidence < 70%

↓

Recommend Expert

Never pretend certainty.

---

## Boundaries of AI

AI can

Detect

Recommend

Predict

Estimate

Cannot

Guarantee recovery

Replace botanists

Guarantee disease classification

Legal disclaimer must exist.

---

## Performance Goals

Plant identification < 3 seconds

Dashboard < 2 seconds

Offline cache

Image compression

Lazy loading

---

## Accessibility

Large fonts

Dark mode

Color blindness friendly

Keyboard accessible

Screen reader support