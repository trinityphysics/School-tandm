# School Tracking & Monitoring

A Vercel-ready Next.js dashboard for Broad General Education tracking and monitoring.

## What it does

- imports CSV exports from SEEMiS and parent portals
- imports published Google Sheets data
- imports Excel workbooks safely without the vulnerable `xlsx` package
- supports manual learner entry for continuous staff tracking updates
- highlights attainment gaps, attendance concerns, wellbeing concerns and learning entitlement issues
- supports status-based attainment tracking (`Off track`, `On track`, `Exceeding expectations`)
- keeps the focus on professional dialogue, timely intervention, breadth, challenge and application

## Getting started

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm test
npm run build
```