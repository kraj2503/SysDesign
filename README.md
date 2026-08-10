# SysDesignLab

An interactive app for learning **High-Level System Design**. Read concise lessons, drag through
architecture diagrams, play with concept demos (CAP triangle, cache policies, consistent hashing,
L4 vs L7), then prove it with randomized quizzes full of tricky gotcha questions. Finish with
12 step-by-step guided design sessions (URL shortener, rate limiter, unique ID generator, key-value
store, … up to a distributed message queue) that take you from requirements → estimation →
assembling the architecture → deep-dive trade-offs → a recap quiz.

> Content is grounded in the classic references: Alex Xu's *System Design Interview*, Kleppmann's
> *Designing Data-Intensive Applications*, ByteByteGo, the Google SRE book, and the system-design-primer.

## Tech stack

- **Client** — React 19 + TypeScript + Vite, Tailwind CSS v4, React Router, React Flow (`@xyflow/react`)
- **Server** — Express 5 + `better-sqlite3` + `tsx` (dev)
- **Data** — SQLite seeded from TypeScript content files in `server/src/seed/content/`

## Quick start

```bash
npm install          # installs client + server workspaces
cp .env.example .env # optional — sets SESSION_SECRET + Google OAuth keys
npm run seed         # (re)create the DB from content files
npm run dev          # runs API (:4000) + Vite (:5173) together
```

Open http://localhost:5173.

## Auth & accounts

Every user gets their own progress and quiz history. The app is gated behind login:

- **Email + password** — register or log in on the `/auth` page (passwords hashed with bcrypt).
- **Google OAuth** — set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`
  in `.env` to enable the "Sign in with Google" button.
- **Unlock cascade** — the first topic starts unlocked. Passing a topic's quiz (60%+) marks it
  completed and unlocks the next topic. Everything (progress, results, streaks) is scoped per user.
- **Quiz history** — every attempt saves a full question-by-question snapshot; review it on the
  `/results` page.

> In dev (`NODE_ENV` unset) a built-in `SESSION_SECRET` is used so login works out of the box.
> Set a real secret in production.

## Deploy (single origin)

Build the client and run the API — Express serves the static site and the API from one origin,
so auth cookies "just work":

```bash
npm run build        # tsc type-check + vite build -> client/dist
NODE_ENV=production SESSION_SECRET="$(openssl rand -hex 32)" npm run start
```

- Set `PORT`, `SESSION_SECRET` (required in production), and `GOOGLE_*` env vars (see `.env.example`).
- The SPA fallback returns `index.html` for client routes and 404s missing assets; `/api/*` always
  returns JSON.

### Free hosting: Oracle Cloud Always Free

The app runs **unchanged** on a free always-on Oracle VM (Express + SQLite + built client on one
origin). See **`deploy/ORACLE.md`** for the console runbook (signup, VM creation, ports) and
`deploy/deploy.sh` for the one-command setup (Node 22, nginx, systemd, seeding). Deploys are
idempotent — re-running the script after a `rsync` code push keeps your `SESSION_SECRET`, Google
keys, and user data.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start API + client together (via `concurrently`) |
| `npm run dev:server` | Express API only on :4000 |
| `npm run dev:client` | Vite client only on :5173 (proxies `/api` → :4000) |
| `npm run seed` | Drop & re-seed `server/data/sysdesign.db` from content |
| `npm run build` | Production build of the client |

## Project structure

```
server/src/
  db.ts               SQLite schema + connection
  index.ts            Express app
  routes/             topics, quiz, progress, case-studies, import
  types.ts            shared TypeScript shapes
  seed/
    seed.ts           seed script (drop, recreate, insert)
    content/
      topics.ts       13 topics
      lessons.ts      26 lessons (markdown + diagram JSON + optional demo hook)
      questions.ts    169 questions (64 tricky; MCQ/multi/scenario)
      caseStudies.ts  4 guided design sessions
client/src/
  pages/              Dashboard, Syllabus, Lesson, Quiz, CaseStudy, Progress, Import
  components/
    DiagramCanvas.tsx        React Flow renderer for lesson diagrams
    QuizPlayer.tsx           randomized quiz engine (timer, feedback, results)
    LessonDemo.tsx           mounts interactive concept demos
    ProgressRing.tsx         reusable SVG progress ring (pure SVG, no images)
    demos/                   CapTriangle, CachePolicies, ConsistentHashing, Lb4Vs7
    simulator/SimulatorShell.tsx 5-step case-study session engine
  lib/ui.ts           shared gradient helpers (tileGradient, barGradient, ringGradient)
  context/ProgressContext.tsx  progress state wired to the API
```

## Design system & UI

The UI is an engaging dark theme built **without image assets or screenshots** — every visual effect is
CSS gradients, SVG, or [lucide](https://lucide.dev) icons.

- **Fonts** (Google Fonts, loaded in `index.html`): **Space Grotesk** for display headings
  (`font-display`), **Inter** for body (`font-sans`), **JetBrains Mono** for code (`font-mono`).
- **Tokens & utilities** in `client/src/index.css`: animated backdrop (`blob` + `bg-grid`), gradient text
  (`.grad-text`), glass surfaces (`.glass`), cards (`.card` / `.card-hover`), buttons (`.btn-primary`,
  `.btn-ghost`), pills (`.chip`), staggered reveals (`.reveal` + `.delay-*`), plus `@theme` keyframes.
- **Lesson markdown** is styled through the `.md-content` class (gradient list bullets, numbered callouts,
  code pills, dark code blocks, tables, blockquotes). Do **not** use Tailwind's `prose` classes —
  `@tailwindcss/typography` is not installed.
- **Shared helpers:** `ProgressRing.tsx` (SVG ring with gradient stroke) and `lib/ui.ts` (literal gradient
  palettes used for topic icon tiles and progress bars/rings).

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | status + counts |
| `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` | email/password auth |
| `GET /api/auth/me` | current user (or `null`) |
| `GET /api/auth/google` · `GET /api/auth/google/callback` | Google OAuth flow |
| `GET /api/topics` | topics with per-user progress (first unlocked, rest locked) |
| `GET /api/topics/:slug` | topic + lessons (+ diagrams, demos) |
| `GET /api/topics/:slug/quiz?count=N` | N random questions (tricky guaranteed) |
| `POST /api/quiz/results` | record a result + full snapshot; passes mark completed & unlock next |
| `GET /api/quiz/results` · `GET /api/quiz/results/:id` | quiz history list / detail (per user) |
| `GET /api/quiz/streak` | current + best daily streak (per user) |
| `GET /api/progress` · `PUT /api/progress/:slug` | read / update topic status (per user) |
| `GET /api/case-studies(/:slug)` | guided design sessions |
| `POST /api/import` | bulk-import questions (JSON or CSV) — see `server/examples/` |

## Adding content

Edit the content files in `server/src/seed/content/` (topics, lessons, questions, caseStudies) and
re-run `npm run seed`. The import page (`/import`) also bulk-loads questions at runtime via JSON or
CSV; sample payloads are in `server/examples/import-sample.json` and `import-sample.csv`.

## Documentation

- **`PLAN.md`** — the living project plan (phases, checkboxes, verification log).
- **`CLAUDE.md`** — project guide for Claude Code: commands, architecture, content-authoring
  conventions, and the working agreement.

## Status

Core app complete (Phases 0–7): 13 topics, 26 lessons, 169 questions (64 tricky),
dashboard/syllabus/lessons/quiz/progress/import, dark theme, streaks.

**12 guided case-study sessions** (Phases 7–9): URL Shortener, Rate Limiter, Unique ID Generator,
Key-Value Store, Web Crawler, Notification System, News Feed, Chat Messenger, Search Autocomplete,
Video Streaming, Proximity/Nearby Friends, Distributed Message Queue. Each is a 5-step interactive
session: requirements → estimation → assemble the architecture → deep-dive trade-offs → recap quiz.

**UI overhaul** (Phase 10, 2026-08-09): full design system — Space Grotesk/Inter/JetBrains Mono,
animated grid + aurora backdrop, glass header, gradient hero, SVG progress rings, styled markdown
(`.md-content`), game-like quiz chrome, visual progress cards, restyled simulator/import/case-study
pages. Client-only; no content changes. See `PLAN.md` Phase 10 for the full change list.

**Auth + per-user progress + quiz history** (Phase 11, 2026-08-09): email/password login + Google
OAuth (JWT in an HttpOnly cookie); a real unlock cascade — passing a topic's quiz marks it completed
and unlocks the next; per-user progress, streaks, and results; full attempt snapshots with a past-results
review page (`/results` + `/results/:id`); and single-origin production serving (Express serves the
built client + API together). See `PLAN.md` Phase 11 for details.
