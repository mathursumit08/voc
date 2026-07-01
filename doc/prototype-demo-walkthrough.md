# VoC Prototype Demo Walkthrough

This guide supports VOC-021 and gives stakeholders a repeatable path through the prototype.

## Reset To Known Demo State

Run this only when you intentionally want to reset local prototype data:

```powershell
npm run seed:prototype
```

The seed script reloads dealers, users, customers, vehicles, job cards, warranty claims, feedback records, and dealer scores from:

```text
src/backend/data/scripts/001_seed_prototype_data.sql
```

## Demo Accounts

```text
admin / Feqma$ecure
oem / Password123
reviewer / Password123
dealer_at_blr_001 / Password123
```

## Curated Customer Journeys

### Journey 1 - Critical EV Charging Recovery

- Customer: `Customer Gurugram 015`
- Vehicle: `Prism EV Long Range`
- Dealer: `Velocity Auto`
- Feedback: `FB-015`
- Storyline: EV charging speed remains unresolved and customer asks for a senior technician.
- Demo path:
  1. Open Feedback Workspace.
  2. Search/filter for `FB-015` or `Prism EV`.
  3. Show negative/critical feedback, repeat/urgency/churn context after scoring.
  4. Create a CRM recovery task.
  5. Generate a dealer response draft and edit it.

### Journey 2 - Warranty Quality Signal

- Customer: `Customer Chennai 005`
- Vehicle: `Nexa Prime Hybrid Plus`
- Dealer: `Elite Autoworks`
- Feedback: `FB-005`
- Storyline: Hybrid warning lamp returns after warranty inspection.
- Demo path:
  1. Open Executive Dashboard.
  2. Run Warranty And Quality Signal detection.
  3. Show grouped signal by model, part, issue, and dealer.
  4. Connect the signal back to warranty-related feedback.

### Journey 3 - Human Review And Classification Correction

- Customer: `Customer Indore 013`
- Vehicle: `Nexa Prime Hybrid`
- Dealer: `Galaxy Auto Center`
- Feedback: `FB-013`
- Storyline: Dashboard clips tightened, but classification confidence may need human correction.
- Demo path:
  1. Sign in as `reviewer`.
  2. Open Feedback Workspace.
  3. Use Human Review Queue.
  4. Correct sentiment, topics, issue category, and urgency.
  5. Resolve with reviewer notes and show traceability.

## Core Screen Checks

- Login: invalid credentials show an error and valid credentials route by role.
- Command Center: static command overview plus curated demo journeys.
- Executive Dashboard: loading, refresh, warranty signal detection, and empty-signal state.
- Dealer Dashboard: Admin/OEM searchable dealer selector; Dealer users see only assigned dealer.
- Feedback Workspace: upload format guidance, paginated explorer, review queue, feedback detail, CRM task, response draft, and empty states.

