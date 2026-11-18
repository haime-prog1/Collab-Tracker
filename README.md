# Collab Tracker

An offline-first Progressive Web App for content creators to manage brand deals, sponsorships and creator collabs: pipeline, brand directory, deliverables, money and perks. **No backend and no account.** Everything is stored in your browser's IndexedDB and works with no connection.

## Features

- **Pipeline:** Kanban board with drag and drop (long-press on touch, keyboard accessible), plus one-tap ← / → stage buttons on every card. A sortable table view collapses to cards on phones. Stages: Inbox / Pitch → Negotiating → Confirmed → In Production → Pending Approval → Published → Archived / Completed. You can rename or hide stages in Settings.
- **Cards** show the brand or creator, platforms (YouTube, TikTok, Instagram, Twitch), payout, payment status, deadline, priority flag, deliverable progress and perks.
- **Deliverables checklist:** each item has its own due date, platform and submission-link field. Quick-add presets are included (Draft script, Video integration, Instagram Reel, Community post…).
- **Money and perks:** amounts default to Philippine pesos (₱, PHP), and each payment can use another currency if needed. Flat fee, usage rights, bonus and affiliate items, each marked Unpaid / Invoiced / Paid with dates. PR packages and gifted products are tracked with estimated value. An earnings widget shows earned vs. pending for the month or quarter, plus invoiced, unpaid, pipeline value and overdue invoices.
- **Brand directory:** contacts (email and phone links), social handles, niche tags, notes, and collab history with lifetime earned and pending totals. Brands are created automatically from the collab form.
- **Global search:** press `/` or `⌘K`. It matches brand, title, platform, stage (including your custom names), tags and deliverables, combined with stage, priority and payment filters.
- **Micro-interactions:** moving a deal to *Published* fires confetti, haptics and a toast. Count badges animate, and stage moves and deletes have Undo. All motion respects `prefers-reduced-motion`.
- **Backup and restore:** export everything to a dated JSON file. On iOS installed apps it opens the Share sheet. Restore by **Replace all** or **Merge** (the newest edit wins per record). Imports are validated with zod. A reminder appears after 14 days without a backup.
- **PWA:** installable, with an install prompt on Android and desktop, Add to Home Screen instructions on iOS, a "new version available" prompt, an offline badge, and a request for persistent storage.

## Calendar, dashboard, reports and search

- **Calendar:** a month view of deliverable due dates, collab deadlines, payments due, payments received and publish dates. Each item shows the brand, the contact person (with an email shortcut), the amount, and a status label (To do · Done · Unpaid · Invoiced · Paid · Overdue). A monthly progress tracker shows deliverables done and payments collected, and an overdue counter jumps to the oldest overdue item. Payments can be marked paid from the calendar.
- **Dashboard:** a summary line, quick actions (new collab, calendar, report, backup), KPI tiles (active deals, due in 7 days, awaiting payment, published this month), a 7-day strip, the earnings widget, *Payments to chase* and *Up next* lists, the pipeline overview and recently published deals.
- **Reports:** choose a period (this/last month, quarter, year, last 12 months, all time, custom) and filter by brand or platform. You get KPIs, an earned-per-month chart (with a table view), breakdowns by brand (with contact person) and by platform, a pipeline snapshot, and a payments ledger. **Print / Save as PDF** gives a clean light layout. **Payments CSV** and **Brands CSV** download spreadsheet files. CSV cells are protected against spreadsheet formula injection.
- **Search:** one search bar (`/` or `⌘K`) finds collabs, brands and contact people (by name, email or role), with keyboard navigation. On the Pipeline page it filters the board live.

## Privacy: your data never goes in this repo

This repository is **public**, and that's fine: it holds **only the app's source code**, plus obviously fake sample data in `src/db/seed.ts` (`example.com` addresses).

- Your real collabs, brands, contacts and payments are saved **only in your browser's IndexedDB on your own device**. The app has no server, no account and no analytics, and it never sends your data anywhere. Publishing or redeploying the app cannot expose it.
- Each person who opens the app gets their **own, separate, empty** local database. Visitors to your deployed site can't see your deals.
- Backups (`collab-tracker-backup-*.json`) and report exports (`collab-tracker-*.csv`) **do** contain your private data. Keep them out of the repo: `.gitignore` already excludes those file names and the `/backups`, `/exports` and `/reports` folders. Store backups somewhere private (your device, a private cloud folder).
- If you fork or contribute, never paste real deal data into issues, pull requests, test fixtures or screenshots.

## Tech stack

Vite · React 18 · TypeScript (strict) · Tailwind CSS v4 · lucide-react · idb · @dnd-kit · zod · date-fns · vite-plugin-pwa (Workbox) · Vitest + fake-indexeddb · Playwright smoke test.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173 (service worker disabled in dev)
npm run build        # type-check + production build into dist/
npm run preview      # serve dist/ at http://localhost:4173 (service worker active)
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm test             # unit tests: finance, search, store, backup, calendar, reports, CSV
npm run test:e2e     # offline smoke test against `npm run preview` (needs the `playwright` package + Chromium)
```

`npm run icons` regenerates the PNG icons from `public/icons/favicon.svg`.

## Deploying

`dist/` is a static site; host it on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages behind a custom domain, S3…). Requirements:

- Serve over **HTTPS**, which service workers require.
- Use an **SPA fallback** to `index.html` for unknown paths so deep links work on the first visit. After that, the service worker handles them offline.
- Don't cache `sw.js` long-term (`Cache-Control: no-cache`), so updates are picked up.
- The app assumes it is served from the domain root (`/`).

## Architecture

```
src/
  lib/calendar.ts        dated events (deliverables, payments, launches) + month progress
  lib/report.ts          report math + CSV export
  lib/globalSearch.ts    collab / brand / contact search
  types/models.ts        domain model (Collab, Brand, Deliverable, CompensationItem, Perk, Settings)
  db/schema.ts           IndexedDB schema + versioned migrations
  db/client.ts           connection, persistent-storage request
  db/store.ts            reactive optimistic store (useSyncExternalStore) + BroadcastChannel tab sync
  db/backup.ts           JSON export / validated import (replace | merge)
  db/seed.ts             sample data
  lib/                   finance math, search, formatting, constants, celebration
  hooks/                 store selectors, install prompt, service worker, media queries
  state/ui.ts            search / filters / editor sheet state
  components/            layout, ui primitives, pipeline, collab editor, brands, finance, pwa
  pages/                 Dashboard, Pipeline, Calendar, Brands, BrandDetail, Finance (Money), Reports, Settings
```

**Data flow.** On boot the whole dataset is loaded into an immutable in-memory snapshot. Components read it synchronously, so screens render instantly. Each mutation updates the snapshot, notifies subscribers, then commits to IndexedDB in a single transaction. If the write fails, the store re-reads from disk (rollback) and shows a toast. Other open tabs re-hydrate through a `BroadcastChannel`.

**Offline.** Workbox precaches the full app shell (all JS, CSS, HTML and icons), so the app works offline right after the first visit. Navigations fall back to `index.html`, and other same-origin and image requests use **StaleWhileRevalidate**. Updates use `registerType: 'prompt'`: the user picks when to reload.

**Data safety.** Browsers can evict site storage, Safari especially for sites that aren't installed. The app requests persistent storage, encourages installing to the home screen, and reminds you to export backups.
