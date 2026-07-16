# Verdant AI
## Product Requirement Document (PRD)

---

# Vision

Every year millions of trees and plants are planted by governments, NGOs, schools, and individuals.

Unfortunately, a large percentage of these plants die within the first two years—not because of climate change alone, but because people simply don't know how to care for them.

Verdant AI aims to become an intelligent companion that helps every plant survive.

Instead of only detecting diseases, Verdant AI provides continuous AI guidance throughout the plant's lifecycle.

Our success is measured not by downloads,
but by the number of plants that stay alive.

---

# Hackathon Build Scope (Day 1)

Time budget: 1 day. This section exists so nobody — including future us — mistakes the roadmap below for the demo. Everything tagged **Day 1** ships today, is real AI (no mocked model outputs), and is what gets demoed. Everything tagged **Roadmap** needs either more build time or real usage data that can't exist yet (multiple weeks of photos, many nearby users, a curated expert directory) — faking that data to look complete would be worse than just saying it's next.

The Day 1 core loop is the actual differentiator: most plant apps stop at "here's your species." Verdant AI's loop is upload → identify → detect disease with a confidence score → get a reasoned treatment + care plan → see it reflected in a health score. That loop, done honestly with real model calls, is the change this project is trying to make — not the breadth of the feature list.

---

# Problem Statement

Plant owners often struggle with

- Identifying plant species
- Understanding watering schedules
- Recognizing diseases early
- Choosing correct fertilizers
- Selecting safe pesticides
- Monitoring long-term growth
- Knowing when expert intervention is required

Current applications mostly stop after disease identification.

Users are left searching Google, YouTube and forums for everything else.

This fragmented experience leads to poor plant health and high mortality.

---

# Target Users

Primary

• Urban households

• Apartment residents

• First-time gardeners

• Students

• Gen Z

Secondary

• Schools

• NGOs

• Municipal Corporations

• Smart Cities

• Plant Nurseries

• Horticulture Departments

Future

• Farmers

• Government Plantation Programs

---

# Objectives

Increase plant survival rate.

Reduce unnecessary pesticide usage.

Reduce water wastage.

Promote urban greenery.

Encourage sustainable lifestyles.

Create a digital health record for every plant.

---

# Core Features

## AI Plant Identification — **Day 1 ✅**

Upload photo

↓

Identify species (real pretrained model/API call)

↓

Store profile

---

## AI Disease Detection — **Day 1 ✅**

Detect

- fungal disease
- bacterial disease
- nutrient deficiency
- pests

Return confidence score.

---

## Personalized Care Planner — **Day 1 ✅ (rule-based, driven by real AI output)**

AI-informed recommendations for

- watering schedule
- fertilizer
- sunlight
- pruning
- repotting

based on

- plant type (from AI identification)
- age
- location
- weather
- season

Note: Day 1 logic is a rule engine that consumes the AI's own species/disease output — the reasoning is real and inspectable, but it isn't a trained recommendation model yet. Don't oversell it as ML in the demo; that upgrade is Roadmap.

---

## Predictive Disease Prevention — **Roadmap**

Instead of reacting,

AI predicts

Potential disease risks using

weather

humidity

temperature

history

Needs historical time-series data Day 1 doesn't have yet.

---

## Smart Reminder Engine — **Day 1 basic version ✅ / Roadmap: adaptive**

Water reminders

Fertilizer reminders

Pruning reminders

Repot reminders

Spraying reminders

Day 1: intervals derived from species + season + weather, not hardcoded — satisfies "no random intervals" without claiming learned adaptivity. Fully adaptive, usage-learned reminders are Roadmap.

---

## Weekly Growth Analysis — **Roadmap**

Users upload one image every week.

AI compares

Week 1

Week 2

Week 3

Growth trend

Leaf density

Plant health

Structurally can't be demoed Day 1 — needs multiple weeks of real data.

---

## AI Health Score — **Day 1 ✅**

Each plant gets

Health Score

0–100

Day 1: computed from disease-detection confidence + care-plan adherence. Continuous refinement over time is Roadmap.

---

## Treatment Recommendation — **Day 1 ✅**

Suggest

Organic treatment

Chemical treatment

Dosage

Safety precautions

Recovery time

---

## Nearby Expert Recommendation — **Roadmap**

If AI confidence < threshold

Recommend

Nearby plant clinics

Botanists

Nurseries

Plant pathologists

Day 1 ships the confidence-based escalation flag (this part is real and important). Actually surfacing nearby experts should use a live Maps/Places API query rather than a hand-built directory — that integration is Roadmap, not Day 1.

---

## Community Heat Map — **Roadmap**

Detect outbreaks

"If many users nearby report fungal disease"

Notify nearby users.

Needs a real user base to mean anything — can't be meaningfully demoed Day 1.

---

## Carbon Impact Dashboard — **Day 1 ✅ (formula-based estimate)**

Show

Trees protected

Estimated CO₂ absorbed

Water saved

Environmental contribution

Day 1: a real calculated estimate from plant type + age + count, not a placeholder number. Historical trending is Roadmap.

---

# Success Metrics

Plant survival rate

Weekly active users

Disease recovery rate

Water saved

Reminder completion rate

Average Health Score improvement

Carbon impact

*(Day 1 demo can only meaningfully show the mechanics behind these metrics, not real longitudinal numbers — that requires actual usage post-hackathon.)*