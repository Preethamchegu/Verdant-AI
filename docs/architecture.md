# System Architecture

# User Flow — Day 1 MVP

Register

↓

Create Plant

↓

Take Photo

↓

AI identifies species

↓

AI detects disease + confidence score

↓

Treatment + Care Plan

↓

Dashboard (Health Score)

↓

Daily Monitoring

*(Roadmap, not Day 1: Weather API integration, Weekly AI Analysis, live Expert Escalation via Maps, Community Reports — see phases.md Post-Hackathon Roadmap.)*

---

# High-Level Architecture

Redrawn below. The original version read as a straight pipeline (Frontend → Backend → AI → DB → Notifications → Weather → Maps), which implies Notifications depends on Weather which depends on Maps. That's not the actual dependency — they're independent services the Backend API calls directly.

```
                    Frontend (Next.js)
                          |
                          v
                Backend API (FastAPI)  <-- hub
                    /   |    |    \
                   /    |    |     \
              AI Engine |    |   Notification Service
                         |    |
                    Database  \
                                Weather Service
                                Maps Service
```

All five (AI Engine, Database, Notification, Weather, Maps) are independent services the Backend API talks to. None of them talk to each other directly.

**Day 1:** only AI Engine + Database are actually wired in. Notification / Weather / Maps are stubbed or omitted from the live demo — see phases.md.

---

# Deployment Topology (Day 1)

```
Vercel (Next.js frontend)
        |
        v  (HTTPS, CORS-restricted to the Vercel URL)
Railway (FastAPI backend + PostgreSQL)
        |
        v  (API token auth)
Hugging Face Serverless Inference API (species + disease models)
```

No self-hosted model, no GPU to manage. See rules.md → Deployment for required accounts, env vars, and the human-only pre-work (account/token creation) that has to happen before an agent can deploy anything.

---

# AI Engine → Folder Mapping

The original doc listed 6 AI capabilities against a 4-folder `ai/` structure without saying how they map. They do map cleanly:

| AI Capability | Folder | Day 1? |
|---|---|---|
| Plant Identification | `ai/classification/` | Yes |
| Disease Detection (pretrained model from Hugging Face/TensorFlow, integrated as a service — not trained from scratch) | `ai/classification/` | Yes |
| Recommendation Engine | `ai/recommendation/` | Yes (rule-based, driven by AI output) |
| Reminder Generator | `ai/recommendation/` | Yes (basic version) |
| Risk Prediction | `ai/prediction/` | Roadmap |
| Growth Prediction | `ai/growth/` | Roadmap |

---

# Folder Structure

*(File names normalized to lowercase to match the actual files in `docs/` and avoid case-sensitivity bugs on Linux deploys — the previous version referenced `PRD.md`, `Architecture.md`, etc. while the real files are lowercase.)*

```
frontend/
  app/
  components/
  features/
    dashboard/
    plants/
    camera/
  notifications/
  services/
  hooks/
  types/
  styles/

backend/
  api/
  models/
  routes/
  services/
  utils/
  database/
  ai/
    classification/
    recommendation/
    prediction/
    growth/

shared/

docs/
  readme.md
  prd.md
  architecture.md
  rules.md
  phases.md
  design.md
  memory.md
```

---

# Database

Users

Plants

PlantImages

DiseaseHistory

HealthScores

Reminders

Treatments

WeatherLogs

ExpertConsultations

CommunityReports

**Day 1:** Users, Plants, PlantImages, DiseaseHistory, HealthScores, Reminders, Treatments are live. WeatherLogs, ExpertConsultations, CommunityReports are schema-ready but stay empty until their Roadmap phases land — keep the tables in the migration now so Day 1 code doesn't need reshaping later.