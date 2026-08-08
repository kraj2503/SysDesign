# SysDesignLab — Project Plan (Living Document)

> **Working agreement:** Re-read this entire file at the start of every phase. Tick a checkbox `- [x]` only when genuinely done and verified. Research ≥2 online sources per topic before authoring content.

**Goal:** A full-stack React app that teaches **High-Level System Design** through interactive lessons, guided "build the system" design-simulator sessions, and randomized quizzes with lots of tricky questions after each topic.

**Decisions (confirmed with user):**
- **Architecture:** Full-stack — React (Vite) frontend + Express API + **SQLite** file DB, seeded from a curated question bank.
- **Question bank:** Curated in-app bank (150+ tricky MCQs + scenario questions) **+ CSV/JSON import tool**.
- **Interactivity:** Rich lessons + interactive diagrams + randomized quizzes **+ step-by-step design-simulator sessions**.
- **Scope:** Broader coverage — 13 core topics + up to 12 interactive case studies.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + **Vite** + Tailwind CSS v4 + React Router |
| Diagrams | **React Flow** (`@xyflow/react`) + custom SVG concept demos |
| Backend | Node + **Express 5** + **better-sqlite3** (synchronous, single-file DB) |
| Dev | `tsx`, `concurrently`, npm workspaces |
| UX | Tailwind + framer-motion + lucide-react + react-markdown/remark-gfm |

---

## Project Structure

```
project_1/
├── package.json                # workspaces: client + server; concurrently dev script
├── PLAN.md                     # this file — living plan with checkboxes
├── CLAUDE.md                   # Claude Code project guide (commands, architecture, conventions)
├── README.md
├── .gitignore
├── client/                     # React + Vite SPA
│   ├── index.html
│   ├── vite.config.ts          # /api proxy → :4000
│   └── src/
│       ├── main.tsx / App.tsx / router.tsx
│       ├── api/client.ts       # typed fetch wrapper
│       ├── context/            # ProgressContext, QuizContext
│       ├── components/         # Layout, Nav, TopicCard, QuizPlayer, DiagramCanvas, SimulatorShell, …
│       ├── pages/              # Dashboard, Syllabus, Lesson, CaseStudy, Quiz, Progress
│       ├── lib/                # helpers
│       └── index.css           # tailwind
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── data/                   # sysdesign.db (gitignored; created by seed)
    └── src/
        ├── index.ts            # Express app + routes
        ├── db.ts               # SQLite connection + schema
        ├── types.ts            # shared data shapes
        ├── routes/             # topics, lessons, quiz, progress, import, caseStudies
        └── seed/
            ├── seed.ts         # drops & re-seeds DB from content
            └── content/        # topics.ts, lessons/, questions/, caseStudies/
```

---

## Database Schema (SQLite)

```sql
topics       (id, slug, title, summary, order_index, icon, status)
lessons      (id, topic_id, slug, title, body_md, diagram_json, order_index)
questions    (id, topic_id, prompt, type, options_json, correct_json,
              explanation, difficulty, is_tricky, order_index)
case_studies (id, slug, title, summary, steps_json)
progress     (topic_id, status, quiz_best_score, quiz_attempts, completed_at)
quiz_results (id, topic_id, score, total, answers_json, taken_at)
```

- `type` ∈ `mcq | multi | scenario` · `difficulty` ∈ 1–3 · `is_tricky` → ⚡ badge.
- `steps_json` drives the interactive simulator session.

---

## Syllabus

**Core topics** (each = lesson(s) + interactive diagram + 12–15 seeded questions). Ordering mirrors Alex Xu's chapters; notes cross-reference ByteByteGo/ByteMonk:

1. **Scale from Zero to Millions** — vertical/horizontal scaling, single-server → LB → DB + cache (Xu ch. 1)
2. **Back-of-the-Envelope Estimation** — QPS, storage, bandwidth math, nines (Xu ch. 2)
3. **Latency, Throughput & Availability** — tail latency, SLA/SLO
4. **CAP & Consistency Models** — CAP, PACELC, strong/eventual/causal, ACID vs BASE
5. **Load Balancing** — L4 vs L7, algorithms, health checks
6. **Caching** — CDN, write policies, cache-aside, LRU/LFU, invalidation, cache-as-a-hammer
7. **Databases** — SQL vs NoSQL, indexing, B-Tree vs LSM, read replicas
8. **Sharding & Partitioning** — range vs hash, **consistent hashing**, rebalancing, hot keys
9. **Replication & Consensus** — leader/follower, quorum, Raft/Paxos, split-brain
10. **Message Queues & Async** — Kafka, pub/sub, exactly-once, backpressure
11. **Microservices & API Design** — monolith vs micro, REST vs GraphQL vs gRPC, versioning
12. **CDN & Edge Computing** — origin vs edge, cache headers, DNS routing
13. **Observability & Reliability** — logs/metrics/traces, alerting, failover, DR

**Case studies** (interactive "build the system" sessions), aligned to Alex Xu:
1. URL Shortener (TinyURL) — ch. 8
2. Rate Limiter — ch. 4
3. Unique ID Generator (Snowflake) — ch. 7
4. Key-Value Store (Dynamo-style) — ch. 6
5. Web Crawler — ch. 9
6. Notification System — ch. 10
7. News Feed — ch. 11
8. Chat Messenger — ch. 12
9. Search Autocomplete — ch. 13
10. Video Streaming (Netflix-style) — ch. 14
11. Proximity / Nearby Friends (Vol 2) — stretch
12. Distributed Message Queue (Vol 2) — stretch

All 12 case studies are shipped: 1–4 in Phase 7, 5–8 in Phase 8, 9–12 in Phase 9 (2026-08-09).

---

## Content Sources & Online Resources

**User-named:** Alex Xu (Vol 1 & 2, user has PDF) · ByteByteGo ([system-design-101](https://github.com/ByteByteGoHq/system-design-101), newsletter, course) · ByteMonk (YouTube).

**Expanded (researched, confirmed live):**
- [System Design Primer](https://github.com/donnemartin/system-design-primer) — foundations + case studies
- [DDIA](https://dataintensive.net/) (Kleppmann) — replication, partitioning, transactions, consensus, storage engines, streaming
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/) — availability, SLOs, capacity planning
- [Amazon Builders' Library](https://builder.aws.com/learn/topics/builders-library) — static stability, throttling, backpressure, leader election
- [High Scalability](https://highscalability.com/) — real-world teardowns (Netflix, Uber, WhatsApp…)
- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html)
- [Grokking the System Design Interview](https://www.grokkingsystemdesign.com/) — interview framing → simulator structure
- Engineering blogs: [Netflix](https://netflixtechblog.com/), [Uber](https://www.uber.com/blog/engineering/), [GitHub](https://github.blog/engineering/), [Stripe](https://stripe.com/blog/engineering), [Cloudflare](https://blog.cloudflare.com/)
- [AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/framework/) — reliability/perf/cost/security pillars
- Official docs: Kafka, Redis, PostgreSQL, Kubernetes, nginx

---

## Question Bank & Quiz Engine

- **Seed target:** ~150–180 questions across 13 topics (~12–15/topic) in `server/src/seed/content/`.
- **Authoring rule:** ≥2 sources per question; tricky distractors modeled on misconceptions those sources call out.
- **Mix:** classic MCQ · tricky gotcha MCQs (⚡ `is_tricky`) · multiple-answer · scenario/estimation.
- **Quiz flow:** `GET /api/topics/:slug/quiz?count=8` → backend picks random (guaranteed to include tricky) → per-question feedback + explanation → score → `quiz_results` + best score in `progress`.
- **Import tool:** `POST /api/import` (CSV or JSON) + admin page + sample file + CLI flag.

---

## Interactive UI Features

- **Dashboard:** progress map (topic nodes + arrows), lock/unlock, best scores, streak.
- **Lesson page:** markdown + inline widgets: React Flow diagrams (drag/zoom, animated edges); concept demos (CAP triangle draggable point, cache write-policy toggle, consistent-hashing ring, L4 vs L7 visual).
- **Case-study simulator:** 5 steps — Requirements → Estimation → Assemble components on canvas → Deep-dive trade-offs → Recap quiz.
- **Quiz player:** randomized Qs, optional timer, progress bar, explanations, "why the distractor is wrong" on tricky Qs.

---

## Implementation Phases

### Phase 0 — Scaffold + PLAN.md
- [x] Create `PLAN.md` at root (this file) with every task as a checkbox
- [x] Root `package.json` (npm workspaces: client, server; `concurrently` dev script)
- [x] `.gitignore` (node_modules, dist, server/data/*.db)
- [x] `client/` scaffold: Vite + React + TS + Tailwind v4 + react-router; `vite.config.ts` `/api` proxy → :4000
- [x] `server/` scaffold: Express 5 + better-sqlite3 + tsx; hello `/api/health` endpoint
- [x] `npm install` at root succeeds; `npm run dev` renders blank app + health API returns ok
- [x] ~~Phase 0 complete~~ *(verified: 13 topics seeded, health returns ok, client renders, proxy works, tsc clean)*

### Phase 1 — DB + seed harness
- [x] `server/src/db.ts`: open `server/data/sysdesign.db`, create schema (topics, lessons, questions, case_studies, progress, quiz_results)
- [x] `server/src/types.ts`: Topic, Lesson, Question, CaseStudy, Progress shapes
- [x] `server/src/seed/seed.ts`: drop/recreate tables, insert from `content/`
- [x] Empty-content seed runs; `sqlite3` shows correct empty tables (13 topics, 0 questions, all 6 tables present)
- [x] `npm run seed` idempotent (re-running clears & re-inserts cleanly)

### Phase 2 — Content authoring (bulk)
- [x] `server/src/seed/content/topics.ts`: 13 topics (slug, title, summary, order, icon)
- [x] Lesson markdown + diagram JSON for all 13 topics — **26 lessons (2/topic)**, diagrams validated (no dangling edges)
- [x] 150+ questions across 13 topics — **169 questions (64 tricky, 13/topic)**, MCQ/tricky/multi/scenario, all with explanations, indices validated (0 warnings)
- [x] Seed runs with ≥150 questions; spot-check tricky flag + explanation coverage
- [x] Interactive `demo` hooks set on 4 lessons (cap-triangle, cache-policies, consistent-hashing, lb-4-vs-7)
- [ ] (Optional) cross-check wording against user's Alex Xu PDF if shared — not yet shared

### Phase 3 — Backend API
- [x] `GET /api/topics` (+ progress join) — verified: 13 topics
- [x] `GET /api/topics/:slug` (with lessons) — verified
- [x] `GET /api/topics/:slug/lessons/:lessonSlug` — verified
- [x] `GET /api/topics/:slug/quiz?count=N` (random, tricky-guaranteed) — verified returns []
- [x] `POST /api/quiz/results` — verified (score → best + attempts)
- [x] `GET/PUT /api/progress/:topicSlug` — verified (incl. validation + 404)
- [x] `GET /api/case-studies` + `GET /api/case-studies/:slug` — verified
- [x] `POST /api/import` (CSV/JSON) + sample files — verified: 2+2 inserted, then clean re-seed

### Phase 4 — Frontend shell + syllabus
- [x] `client/src/api/client.ts` typed fetch wrapper
- [x] Layout + nav (Dashboard / Syllabus / Progress)
- [x] Dashboard: topic map, progress (streaks land in Phase 7)
- [x] Syllabus page: all 13 topics with lock/unlock
- [x] Lesson page: markdown render + diagram canvas + interactive demos
- [x] ProgressContext wired to API
- [x] **Verified:** `vite build` succeeds; all key modules transform (200); API serves 169 questions through proxy

### Phase 5 — Quiz engine UI
- [x] QuizPlayer: random Qs, per-question timer, progress bar, per-Q feedback
- [x] Explanations incl. "why the distractor is wrong" for tricky (⚡ badge + explanation text)
- [x] Results screen + best-score persistence (POST /api/quiz/results, pass threshold marks topic completed)

### Phase 6 — Interactive diagrams + simulator
- [x] React Flow diagram canvas component (drag/zoom, animated edges) — renders 26 lesson diagrams
- [x] Concept demos: **CAP triangle** (draggable) + **cache policy toggle** — built & wired
- [x] Concept demos: **consistent-hashing ring** (add/remove nodes, moved keys highlighted) + **L4/L7** capability toggle
- [x] Case-study simulator shell (5-step: requirements → estimation → assemble → deep dive → quiz)
- [x] First case study fully authored: **URL Shortener**

### Phase 7 — Polish + case studies 1–4
- [x] Case studies 1–4: URL Shortener, Rate Limiter, Unique ID Generator, Key-Value Store — authored & API-verified (5-step each)
- [x] Streaks on dashboard (`GET /api/quiz/streak`: current + best; verified 0 → 1 after a quiz)
- [x] Import admin page (`/import`, JSON or CSV) + `server/examples/` samples
- [x] Dark theme (dark by default throughout)
- [x] README + seed CSV example

### Phase 8 — More case studies (stretch)
- [x] Web Crawler
- [x] Notification System
- [x] News Feed
- [x] Chat Messenger

### Phase 9 — Remaining case studies (stretch) — shipped 2026-08-09
- [x] Search Autocomplete (Typeahead) — trie + precomputed top-K + in-memory serving
- [x] Video Streaming — chunked adaptive bitrate, CDN edge, async encode pipeline
- [x] Proximity / Nearby Friends — geohash/Redis GEO + H3, boundary pitfall, privacy
- [x] Distributed Message Queue — Kafka-style partitions, offsets, at-least-once, ISR replication
- [x] Final QA: 13 topics + all sessions, full verification pass (see Verification log)

### Phase 10 — UI overhaul: engaging design system (2026-08-09)
> User directive: "improve UI, make it more engaging, remove boring texts/fonts; avoid images/screenshots."
> Client-only redesign — no server or content changes, so no re-seed required.

- [x] **Fix root cause of "boring text":** lesson markdown rendered **unstyled** because `@tailwindcss/typography`
  was never installed (`prose` classes were no-ops). Added full `.md-content` styling in `index.css`
  (gradient-bulleted lists, numbered callouts, inline-code pills, dark code blocks, tables, blockquotes).
- [x] Fonts: Space Grotesk (display) + Inter (body) + JetBrains Mono (code) via Google Fonts `<link>` in
  `client/index.html`; inline SVG favicon; `<meta>` description + theme-color.
- [x] Design tokens & utilities in `client/src/index.css`: `@theme` animations (`fade-up`, `float`,
  `glow-pulse`, `gradient-x`, `pop`, `pulse-ring`, `spin-slow`), `.grad-text`, `.glass`, `.card`/`.card-hover`,
  `.tile`, `.btn-primary`, `.btn-ghost`, `.chip`, `.blob`+`.bg-grid` (animated backdrop), `.reveal`+`.delay-*`
  stagger, custom scrollbar + `::selection`, reduced-motion guard.
- [x] Shared helpers: `client/src/lib/ui.ts` (literal Tailwind gradient palettes: `tileGradient`,
  `barGradient`, `ringGradient`) and `client/src/components/ProgressRing.tsx` (pure SVG progress ring —
  no images).
- [x] `Layout.tsx`: glass sticky header with gradient logo mark, pill nav, fixed animated grid + aurora
  blob backdrop shared across all pages; `max-w-6xl` → `max-w-7xl`.
- [x] `Dashboard.tsx`: gradient hero (punchy copy, animated badge chips, CTA), 4 animated stat cards with
  SVG rings, glowing "continue learning" cards with per-topic progress, case-study cards with step badges.
- [x] `Syllabus.tsx`: pathway list with gradient step tiles, lock/completed/available chips, progress
  underline, overall % ring; `Circle/Lock` icons replaced with gradient number chips.
- [x] `Lesson.tsx`: gradient topic header with chips, numbered lesson cards, `.md-content` markdown,
  "Live demo" frame (`LessonDemo.tsx` with pulsing dot + hint), `DiagramCanvas.tsx` with kind legend.
- [x] `Quiz.tsx` + `QuizPlayer.tsx`: game-like chrome — segmented progress, timer/difficulty/tricky chips,
  letter-badge options with glow states, gradient feedback panels, ring-based results screen + retake.
- [x] `Progress.tsx`: plain table → visual cards with best-score SVG rings, attempt counts, status chips.
- [x] `CaseStudy.tsx`, `Import.tsx`, `SimulatorShell.tsx`: restyled to match (stepper pills, step cards,
  quiz-widget options).
- [x] **Verified:** `npm run build` (tsc + vite) passes clean; dev smoke test (client :5173 HTTP 200, API
  `/health` → 13 topics / 169 questions).

---

## Verification

0. **Plan tracking:** `PLAN.md` checkboxes reflect reality — never mark done what isn't verified.
1. `npm install` then `npm run seed` → `sqlite3 server/data/sysdesign.db "SELECT count(*) FROM questions;"` ≥ 150, 13 topics present.
2. `npm run dev` → http://localhost:5173 — dashboard loads topics from API (proxy → :4000).
3. Full loop on one topic: lesson (diagram renders) → quiz (random each attempt, tricky flagged, explanations) → score saved.
4. One case-study session end-to-end (URL shortener).
5. `curl -X POST localhost:4000/api/import ... --data @sample.json` → new question appears in quizzes.

**Full verification run — 2026-08-08 (all passing):**
- `npm run seed` → 13 topics, 26 lessons, 169 questions (64 tricky), 4 case studies; all 6 tables present.
- `npm run dev` → server :4000 + Vite :5173 both up; all 15 key routes/modules transform with HTTP 200.
- GET endpoints verified through proxy: `/health` (13/169), `/topics` (13), `/topics/:slug` (lessons + parsed diagrams), `/topics/:slug/quiz?count=8` (8 Qs, tricky guaranteed), `/case-studies`, `/quiz/streak`, `/progress`.
- Write endpoints: `POST /quiz/results` (score 7/8 → best 88%, streak 1), `PUT /progress/:slug`, `POST /import` (JSON + CSV, 2+2 inserted, then clean re-seed).
- Error handling: missing fields → 400, unknown topic → 404.
- `npm run build` (tsc + vite) succeeds; server `tsc --noEmit` clean.
- `CLAUDE.md` created with commands, architecture, and authoring conventions.

**Phase 8 verification run — 2026-08-08 (passing):**
- Authored 4 new interactive sessions: **Web Crawler, Notification System, News Feed, Chat Messenger** (research grounded in system-design-primer solution READMEs + WhatsApp/High Scalability architecture + Alex Xu ch. 9–12).
- `npm run seed` → 13 topics, 26 lessons, 169 questions (64 tricky), **8 case studies**; all 6 tables present.
- Each new session verified through `GET /api/case-studies/:slug`: requirements (8 options / 7 correct) → estimation (4 items) → assemble (6–7 components + 1 decoy) → deep-dive (5 Qs) → recap quiz (4 Qs, incl. tricky).
- `npm run build` (tsc + vite) succeeds; client unchanged, so no new type errors.

**Phase 10 verification run — 2026-08-09 (passing):**
- `npm run build` (tsc --noEmit + vite build) passes clean after the full UI redesign — no type errors, no unused locals.
- `npm run dev` smoke test: Vite client serves HTTP 200 on :5173; API `/health` on :4000 returns `topicCount: 13`, `questionCount: 169`.
- Client-only changes — server untouched, content untouched, no re-seed required.
- Design constraints honored: zero `<img>` assets / screenshots added; all visual flair is CSS gradients, SVG (`ProgressRing`), and lucide icons.

**Phase 9 verification run — 2026-08-09 (passing):**
- Authored 4 new 5-step sessions (requirements → estimation → assemble → deep dive → recap quiz) in
  `server/src/seed/content/caseStudies.ts`: **Search Autocomplete, Video Streaming, Proximity/Nearby
  Friends, Distributed Message Queue**. Each: 8 requirement options (7 correct), 3 estimation items,
  assemble with decoy components, 4–5 deep-dive questions (2 tricky each), 3 recap questions.
- Researched before authoring (≥2 sources/topic): Alex Xu ch.13/14/Vol2 (user ref) + Wikipedia *Trie* &
  *Geohash* (incl. precision table + boundary limitations) + [Redis GEO docs](https://redis.io/docs/latest/commands/geosearch/) +
  [Uber H3](https://www.uber.com/blog/h3/) + [Apache Kafka docs](https://kafka.apache.org/documentation/) +
  [AWS "What is a CDN?"](https://aws.amazon.com/what-is/cdn/) + ByteByteGo system-design-101 index.
- `npm run seed` → DB recreated with 13 topics / 26 lessons / 169 questions (64 tricky) / **12 case studies**.
- Verified every new session via `GET /api/case-studies/:slug` (structure + counts above) and
  `GET /api/case-studies` returns all 12.
- `npm run build` (tsc + vite) passes; full `npm run dev` smoke test: client :5173 HTTP 200, health OK.
- **Note:** seeding recreates the DB, so in-app progress/quiz results were reset (expected).
