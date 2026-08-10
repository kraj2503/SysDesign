---
name: auth-progress
description: Build Phase 11 of PLAN.md — per-user authentication (email/password + Google OAuth), fix progress tracking with a real unlock cascade, and add a past-quiz-results review page. Invoke when the user asks to add login, fix progress/quizzes, or add quiz history.
---

# Implement auth + per-user progress + quiz history

Executes **PLAN.md Phase 11**. Re-read `PLAN.md` (Phase 11) first — it is the canonical spec and this
skill is its run-book. Do **not** skip sections; work 11.1 → 11.7 in order.

## 0. Context: confirmed bugs (from a live probe)

- No `progress` rows are seeded and `/api/topics` defaults every topic to `unlocked` → nothing is ever
  `locked`; the "finish quiz to unlock next" promise is unimplemented.
- `POST /api/quiz/results` only updates best score + attempts; it never marks the topic completed and
  never unlocks the next topic.
- `GET /api/quiz/results` returns 404; `quiz_results.answers_json` stores only `[{id, selected}]`.
- All progress/quiz/streak data is global (no users).

## 11.1 Database (`server/src/db.ts`)

Add to `initSchema()`:
- `users (id INTEGER PK AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT, google_sub TEXT
  UNIQUE, name TEXT, avatar_url TEXT, created_at TEXT NOT NULL)`
- Re-key `progress` → `PRIMARY KEY(user_id, topic_id)`, add `user_id INTEGER NOT NULL REFERENCES users(id)
  ON DELETE CASCADE`.
- Add `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE` to `quiz_results`.
- Because existing dev DBs are keyed on `topic_id`, the seed's `reset()` drops the tables — so a
  re-seed (`npm run seed`) handles the migration. No progress rows are seeded.

## 11.2 Auth

Add deps to `server/package.json`: `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `google-auth-library`.

Create `server/src/middleware/auth.ts`:
- `signToken(userId)` → JWT signed with `process.env.SESSION_SECRET` (exp ~30d).
- `setAuthCookie(res, userId)` → `res.cookie('token', jwt, { httpOnly: true, sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production', maxAge: 30d, path: '/' })`.
- `clearAuthCookie(res)`.
- `requireAuth` → verify cookie token, set `req.userId`, else 401 `{ error: 'Authentication required' }`.
- `optionalAuth` → set `req.userId` if present, never error.

Create `server/src/routes/auth.ts`:
- `POST /register` — validate email/password (min 8 chars), `bcrypt.hash`, insert, handle UNIQUE
  constraint → 409 `Email already registered`, issue cookie, return `{ user }`.
- `POST /login` — look up by email, `bcrypt.compare`, generic 401 on bad creds, issue cookie, return user.
- `POST /logout` — clear cookie.
- `GET /me` — `optionalAuth`; return `{ user }` or `{ user: null }`.
- `GET /google` — build Google consent URL: `client_id`, `redirect_uri`, `response_type=code`,
  `scope=openid email profile`, `state=<crypto.randomBytes(16).toString('hex')>` stored in a short-lived
  cookie. Redirect.
- `GET /google/callback` — verify `state` cookie; exchange `code` for tokens via `OAuth2Client`;
  `getTokenInfo` / verify the id_token; upsert user by `google_sub` (else by email); issue cookie;
  redirect to `/`.
- Export an object of handlers; wire in `server/src/index.ts`:
  `app.use('/api/auth', authRouter)`, and `app.use(cookieParser())` **before** routes.
- Require `SESSION_SECRET` (throw at boot if missing in production).

Env vars (document in README + `.env.example`): `SESSION_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `NODE_ENV`, `PORT`.

## 11.3 Progress fix

- `routes/topics.ts` `GET /`: protect with `requireAuth`; LEFT JOIN progress on `(topic_id, user_id)`.
  Default status per user: index 0 → `unlocked`, else `locked` when no row.
- `routes/topics.ts` `GET /:slug`: include `user_id` in the progress lookup.
- `routes/quiz.ts` `POST /results`: `requireAuth`. In one `db.transaction(() => {...})`:
  1. Insert `quiz_results` with `user_id` and the full snapshot `answers_json`.
  2. Upsert `progress (user_id, topic_id)` with `quiz_best_score = max(existing, pct)`,
     `quiz_attempts = attempts + 1`.
  3. If `pct >= 60` and current status != `completed`: set `completed` + `completed_at`; then find the
     next topic `order_index + 1` and upsert its progress to `unlocked` (leave best/attempts untouched).
- `routes/quiz.ts` `GET /streak`: filter by `user_id`.
- `routes/progress.ts`: `requireAuth`; `GET /` and `PUT /:slug` scoped to `user_id`.

## 11.4 Quiz history

- `submitQuizResult` client payload (`client/src/api/client.ts`): change `answers` to a full snapshot per
  question: `{ question_id, prompt, type, options, correct, selected, explanation, is_tricky }`.
- `routes/quiz.ts`:
  - `GET /results` (`requireAuth`) — join topics for `topic_slug`; return
    `[{ id, topicSlug, score, total, percent, takenAt }]`, newest first; optional `?topic=` filter.
  - `GET /results/:id` (`requireAuth`, ownership check) — return `{ id, topicSlug, score, total, percent,
    takenAt, questions: snapshot[] }`.

## 11.5 Client

- `client/src/api/client.ts`: add `auth.me/register/login/logout`, `listQuizResults`, `getQuizResult(id)`.
- New `client/src/context/AuthContext.tsx` mirroring `ProgressContext`: `user`, `loading`, `login`,
  `register`, `logout`, `refresh`. On mount call `/api/auth/me`.
- New `client/src/pages/Auth.tsx` (`/auth`): login/register tabs (email+password) + "Sign in with Google"
  button (`window.location.href = '/api/auth/google'`).
- New `client/src/pages/Results.tsx` (`/results`) and `client/src/pages/ResultsDetail.tsx`
  (`/results/:id`): list attempts; detail renders each question card with "You answered X · Correct Y"
  and the explanation, styled with the existing `.card`/`.chip`/`.md-content` system (no new palettes;
  reuse `lib/ui.ts` + `ProgressRing.tsx`).
- Guard data routes: wrap the app so that when `AuthContext.loading` is false and `user` is null, show
  `/auth` (redirect via `<Navigate>` or route guard). Add a small user menu (name/avatar, logout) to
  `Layout.tsx`.
- Add links: from the quiz `finished` screen ("View past results") and from `Progress.tsx`.

## 11.6 Deployment

- `server/src/index.ts`: when `NODE_ENV === 'production'` (or `CLIENT_DIST` set), serve
  `express.static(client/dist)` and a final `app.get('*', ...)` SPA fallback returning `index.html`
  (must come after `/api/*` routes). Keep the JSON error handler.
- Client `vite.config.ts` already proxies `/api` in dev; no change needed for prod (same origin).
- Update README quick-start with `.env.example` and a "Deploy" note: `npm run build` then `npm run start`.

## 11.7 Verification (run all)

1. `npm run seed`, start server, `curl` with no cookie → `GET /api/topics` = 401.
2. Register → cookie set → `GET /api/topics` shows topic 1 `unlocked`, rest `locked`.
3. `POST /api/quiz/results` 8/8 on topic 1 → topic 1 `completed`, topic 2 `unlocked`.
4. Submit again with a lower score → best score stays 100, attempts = 2.
5. `GET /api/quiz/results` → 2 entries; `GET /api/quiz/results/:id` → snapshot present.
6. Google callback with a real test client id/secret (or verify the upsert logic with a mocked id_token).
7. Register a second user → its `GET /api/topics` / results are independent of the first.
8. `npm run build`; prod smoke test on one port: static client, login, quiz, results review.
9. Update PLAN.md: tick Phase 11.1–11.7, add a Phase 11 verification-run entry (mark what was verified
   and any deviations), and refresh README status.
