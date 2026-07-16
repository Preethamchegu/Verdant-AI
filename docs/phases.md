# Development Roadmap

## Day 1 — Hackathon Build Plan

One real day. Every block below is something that can actually be demoed live, using real AI calls — nothing here depends on data that doesn't exist yet (multi-week photos, many users, an expert directory).

**Deploy early, not just at the end.** The submission requirement is a live, working URL — "broken deployment = points lost." Get an empty skeleton live in Block 1 and redeploy after every block, so a broken prod environment surfaces in minutes, not at hour 11 when there's no time left to fix it.

**Block 1 — Setup + First Deploy (Hr 0–1)**
Repo scaffold (frontend/backend)
Env config
DB schema (SQLAlchemy models)
Push a "hello world" skeleton live immediately: empty Next.js page on Vercel, a FastAPI `/health` route on Railway, DB connected — prove the pipeline works end-to-end before any real feature is built on top of it

**Block 2 — Auth + Shell (Hr 1–2)**
Minimal auth (email/password or magic link)
Landing page
Dashboard shell

**Block 3 — Plant Registration + AI ID (Hr 2–4)**
Photo upload
Species identification — real pretrained model/API call
Store plant profile

**Block 4 — Disease Detection + Treatment (Hr 4–6)**
Disease/pest detection (pretrained model, integrated not trained from scratch)
Confidence score on every prediction
Treatment recommendation (organic/chemical, dosage, safety, recovery time)
Confidence < 70% → expert-escalation flag

**Block 5 — Care Planner + Health Score (Hr 6–8)**
Watering / fertilizer / sunlight plan — rule engine driven by species + season + weather
Health Score (0–100) computed from detection confidence + care adherence

**Block 6 — Carbon Impact + Dashboard Polish (Hr 8–9)**
Carbon/water-saved estimate — formula-based, tied to plant type + age (real math, not a placeholder)
Dashboard: plant cards, health score ring, care plan, treatment panel

**Block 7 — Accessibility + Polish (Hr 9–10)**
Dark mode, font scaling, keyboard nav, image compression, lazy loading

**Block 8 — Live Deploy Verification (Hr 10–11)**
Redeploy the final build, don't demo off a stale earlier deploy
Set required env vars in the Vercel/Railway dashboards (never commit secrets to the repo)
Confirm CORS on the backend allows the live frontend URL, not just localhost
Run through the full user flow (Register → Add Plant → AI ID → Disease Detection → Care Plan → Dashboard) on the *live URL*, not localhost
If the backend is on a platform with cold-start/sleep behavior (e.g. Render free tier), hit the live URL a minute or two before recording so it's warm — a 30-60s blank screen at the start of a demo video looks like a broken deployment even when it isn't

**Block 9 — Demo Prep + Submit (Hr 11–12)**
Seed data for a smooth walkthrough
1–2 page problem statement / submission doc
2–3 min screen recording: problem → solution → AI working in action, recorded against the live URL
Fill submission form with all links
Submit before 19 Jul 11:59 PM

---

#