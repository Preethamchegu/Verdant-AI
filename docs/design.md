# Design System

*(This file used to be a byte-for-byte duplicate of phases.md. Replaced with an actual design system — a fast, hackathon-appropriate stand-in for a full wireframe pass, given the 1-day budget.)*

---

## Visual Direction

Theme: "Clean & Green" — calm, natural, trustworthy. Should feel like a plant-care companion, not a clinical diagnostic tool. Confidence scores and health data should read as reassuring, not alarming.

---

## Color Palette

Primary (deep leaf green): `#1B4332`

Secondary / CTA (fresh green): `#40916C`

Background (light): `#F7FAF7`

Background (dark mode): `#0D1B14`

Warning — disease detected: `#D97706`

Danger — low confidence / expert needed: `#DC2626`

Success — healthy: `#2D6A4F`

Text primary: `#1B1B1B` (light) / `#F1F1F1` (dark)

---

## Typography

Headings: Inter or Poppins, semi-bold

Body: Inter, regular

Minimum body size: 16px (ties to rules.md accessibility — "large fonts")

Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40

---

## Core Screens (Day 1)

1. **Landing** — value prop: "every plant deserves a fighting chance"
2. **Auth** — sign up / log in
3. **Dashboard** — plant cards (thumbnail, health score, next action)
4. **Add Plant** — photo capture/upload → AI identification result
5. **Plant Detail** — species info, disease detection result + confidence, treatment plan, care plan, carbon impact
6. **Settings** — dark mode toggle, accessibility options

---

## Key Components

**Plant Card** — photo, name, health score ring (0–100), status badge (Healthy / At Risk / Needs Expert)

**Confidence Badge** — shown next to every AI output, no exceptions. Never display a prediction without it (ties directly to rules.md Error Handling)

**Care Plan Panel** — watering / fertilizer / sunlight, each with a one-line "why" (ties to rules.md — "every recommendation should have reasoning")

**Expert Escalation Banner** — shown when confidence < 70%. Calm, informative tone, not alarming

---

## States

Every AI-driven view needs four states designed, not just the happy path: **loading, success, low-confidence, error/offline.** The confidence-based escalation is a core product behavior, not an edge case — design it with the same care as the success state.

---

## Accessibility

(Ties directly to rules.md Accessibility section)

- Dark mode available as a real toggle, not just a CSS variable nobody wired up
- Health status never relies on color alone — pair color with an icon + text label (color-blindness friendly)
- All interactive elements keyboard-reachable
- Screen-reader labels specifically on the health score ring and confidence badge — these are icon/number-heavy and easy to miss with a screen reader