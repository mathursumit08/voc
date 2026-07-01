# Database Scripts

Standalone SQL scripts live in this folder.

## Prototype Seed

- `001_seed_prototype_data.sql` resets and reloads VOC-003 prototype data.
- It includes 50 dealers, sample customers, vehicles, job cards, warranty claims, feedback records, and dealer score rows.
- VOC-021 curated journeys:
  - `FB-015` critical EV charging recovery.
  - `FB-005` warranty quality signal.
  - `FB-013` human review correction.

Run explicitly when you want to reset demo data:

```powershell
npm run seed:prototype
```

