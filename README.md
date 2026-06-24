# School Tracking & Monitoring

A Vercel-ready Next.js dashboard for Broad General Education tracking and monitoring.

## What it does

- imports CSV exports from SEEMiS and parent portals
- imports published Google Sheets data
- imports Excel workbooks safely without the vulnerable `xlsx` package
- provides a central tracker API with normalized pupil, class, assessment and result records
- supports teacher workflows for selecting year + class + subject and saving assessment updates
- supports leadership workflows for filtered analysis and CSV export from the same tracker data
- highlights attainment gaps, attendance concerns, wellbeing concerns and learning entitlement issues
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