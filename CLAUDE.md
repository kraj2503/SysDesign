# CLAUDE.md — Project Guide for Claude Code

## Overview

SysDesignLab is a full-stack app that teaches **High-Level System Design** through interactive
lessons, React Flow architecture diagrams, concept demos (CAP triangle, cache policies, consistent
hashing, L4 vs L7), randomized "tricky" quizzes, and step-by-step guided case-study sessions.

- **Client:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + React Flow (`@xyflow/react`)
- **Server:** Node + Express 5 + `better-sqlite3` (synchronous, single-file SQLite DB)
- **Monorepo:** npm workspaces — `client/` and `server/`

## Commands (run from project root)

| Command | Purpose |
|---|---|
| `npm run dev` | Start API (:4000) + Vite client (:5173) together (via `concurrently`) |
| `npm run seed` | Drop & re-seed `server/data/sysdesign.db` from `server/src/seed/content/` |
| `npm run build` | Production build of the client (runs `tsc --noEmit` first) |
| `npm run dev:server` / `npm run dev:client` | Run one side only |
| `npm run start` | Run the Express server only (production mode) |
| `bash deploy/push.sh <PUBLIC_IP>` | Build client locally + deploy to the Oracle VM (ships prebuilt `client/dist`) |
| `bash deploy/network-setup.sh [--ip <IP>]` | Open every Oracle firewall layer (security list(s) + NSGs + OS firewall via SSH), assign a public IP, verify — fixes "works on localhost but not from the internet" |

## Architecture

- **All content is code.** Topics, lessons, questions, and case studies are TypeScript data in
  `server/src/seed/content/` and are seeded into SQLite. To edit content: edit those files, then
  re-run `npm run seed`. There is no CMS or admin editing path for seeded content.
- **API routes** live in `server/src/routes/`. The client fetches through the typed wrapper
  `client/src/api/client.ts`; Vite proxies `/api` → :4000 (see `client/vite.config.ts`).
- **Auth (Phase 11):** JWT in an HttpOnly cookie (`token`). Helpers in `server/src/middleware/auth.ts`
  (`requireAuth` / `optionalAuth` attach `req.userId`); routes in `server/src/routes/auth.ts`
  (email/password + Google OAuth). All `/api/topics`, `/api/quiz`, `/api/progress` routes are
  auth-gated and scoped per user. Env: `SESSION_SECRET`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`
  (see `.env.example`; `server/src/env.ts` loads a root `.env`).
- **DB schema** is defined in `server/src/db.ts`; shared data shapes are in `server/src/types.ts`
  (server) and `client/src/types.ts` (client). Progress is keyed `PRIMARY KEY(user_id, topic_id)`;
  `quiz_results` stores a full per-question snapshot in `answers_json`.
- **Unlock cascade:** first topic starts `unlocked`; `POST /api/quiz/results` atomically records the
  result, updates best/attempts, and (≥ 60%) marks the topic completed + unlocks the next in order.
- **Case-study simulator:** `client/src/components/simulator/SimulatorShell.tsx` drives a 5-step
  session from each case study's `steps_json`.

## UI & Design System Conventions

- **No `<img>` assets or screenshots** — a standing user preference. All visual flair is CSS
  gradients, SVG, or lucide-react icons.
- **Fonts** load from Google Fonts in `client/index.html`: Space Grotesk (`font-display`), Inter
  (`font-sans`), JetBrains Mono (`font-mono`).
- **Design tokens & utilities** live in `client/src/index.css`: `.grad-text`, `.glass`, `.card` /
  `.card-hover`, `.tile`, `.btn-primary`, `.btn-ghost`, `.chip`, `.blob` + `.bg-grid` (backdrop),
  `.reveal` + `.delay-1..5` (stagger), plus `@theme` animations (`animate-fade-up`, `animate-float`,
  `animate-glow-pulse`, `animate-pop`, …). Reuse these instead of inline ad-hoc styling.
- **Lesson markdown:** do NOT use Tailwind `prose` classes — `@tailwindcss/typography` is NOT
  installed, so they render unstyled. Style markdown with the `.md-content` class from `index.css`.
- **Reusable UI helpers:** `client/src/components/ProgressRing.tsx` (SVG ring with gradient stroke)
  and `client/src/lib/ui.ts` (`tileGradient(i)`, `barGradient(i)`, `ringGradient(i)` — literal
  Tailwind class strings that survive purging). Reuse them rather than inventing new palettes.
- **Auth UI:** `client/src/context/AuthContext.tsx` (user/loading/login/register/logout) wraps the app;
  `client/src/pages/Auth.tsx` is the standalone `/auth` screen. Data routes are guarded by `RequireAuth`
  in `client/src/App.tsx`. Quiz-history pages `Results.tsx` / `ResultsDetail.tsx` render attempts with the
  same `.card`/`.chip`/`ProgressRing` system.
- Keep UI copy punchy; avoid long descriptive walls of text in the chrome (headers, subtitles, labels).

## Content Authoring Rules

- Every topic = **2 lessons** (markdown `body_md` + diagram `nodes`/`edges` JSON) + **13 seeded
  questions** (169 total across 13 topics).
- Question `type` ∈ `mcq | multi | scenario`, `difficulty` 1–3; `is_tricky` flags gotcha
  questions (rendered with a ⚡ badge + "why the distractor is wrong").
- **Research ≥2 sources per topic** before authoring lessons/questions. Content is grounded in
  Alex Xu (Vol 1 & 2), Kleppmann's DDIA, ByteByteGo, the Google SRE Book, the system-design-primer,
  and engineering blogs (Netflix, Uber, Cloudflare, …).
- Interactive concept demos attach to lessons via the `demo` field
  (`cap-triangle | cache-policies | consistent-hashing | lb-4-vs-7`); components live in
  `client/src/components/demos/`.

## Working Agreement

- **`PLAN.md` at the project root is the canonical plan.** Re-read the entire file at the start of
  every phase before touching code. Tick `- [x]` only when genuinely done **and** verified.
- `npm run seed` wipes and rebuilds the DB — progress and quiz results are cleared on every seed.
- Content files are large (lessons + questions are the bulk of the repo); prefer targeted `Edit`
  calls over rewriting whole files.

## Verification

- After `npm run seed`: 13 topics, 26 lessons, 169 questions (64 tricky), 4 case studies,
  all 6 tables present.
- `npm run dev` → open http://localhost:5173; `curl localhost:4000/api/health` for status.
- After touching client code: `npm run build` (type-checks + bundles) must succeed.
