import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { db } from '../db'
import { clearAuthCookie, optionalAuth, setAuthCookie } from '../middleware/auth'

const router = Router()

interface UserRow {
  id: number
  email: string
  password_hash: string | null
  google_sub: string | null
  name: string | null
  avatar_url: string | null
  created_at: string
}

function toPublicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = (req.body ?? {}) as {
      name?: unknown
      email?: unknown
      password?: unknown
    }

    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email is required' })
    }
    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const passwordHash = await bcrypt.hash(password, 10)
    const displayName = typeof name === 'string' && name.trim() ? name.trim() : null

    let userId: number
    try {
      const info = db
        .prepare('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)')
        .run(normalizedEmail, passwordHash, displayName, new Date().toISOString())
      userId = Number(info.lastInsertRowid)
    } catch (e: unknown) {
      if (e instanceof Error && /UNIQUE/i.test(e.message)) {
        return res.status(409).json({ error: 'Email already registered' })
      }
      throw e
    }

    setAuthCookie(req, res, userId)
    res.status(201).json({ user: { id: userId, email: normalizedEmail, name: displayName, avatar_url: null } })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
      | UserRow
      | undefined

    if (!row?.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, row.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    setAuthCookie(req, res, row.id)
    res.json({ user: toPublicUser(row) })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(req, res)
  res.json({ ok: true })
})

// GET /api/auth/me — optionalAuth: { user } or { user: null }
router.get('/me', optionalAuth, (req, res) => {
  if (!req.userId) {
    res.json({ user: null })
    return
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as UserRow | undefined
  res.json({ user: row ? toPublicUser(row) : null })
})

// ---- Google OAuth (authorization code flow, no Passport) ----

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/auth/google/callback'

// GET /api/auth/google — build consent URL, stash a CSRF state cookie, redirect.
router.get('/google', (_req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth is not configured on this server' })
  }
  const state = randomBytes(16).toString('hex')
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/api/auth',
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  })}`
  res.redirect(url)
})

// GET /api/auth/google/callback — exchange code, upsert user, set cookie, redirect home.
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string }
    const expectedState = req.cookies?.oauth_state as string | undefined

    // clear the one-time state cookie regardless of outcome
    res.clearCookie('oauth_state', { path: '/api/auth', httpOnly: true, sameSite: 'lax' })

    if (!code || !state || !expectedState || state !== expectedState) {
      return res.redirect('/auth?google=error')
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect('/auth?google=error')
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
    const { tokens } = await client.getToken(code)
    const idToken = tokens.id_token
    if (!idToken) {
      return res.redirect('/auth?google=error')
    }
    const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    const sub = payload?.sub
    const email = payload?.email
    if (!sub || !email) {
      return res.redirect('/auth?google=error')
    }

    const normalizedEmail = email.toLowerCase()
    const row = db
      .prepare('SELECT * FROM users WHERE google_sub = ? OR email = ?')
      .get(sub, normalizedEmail) as UserRow | undefined

    let userId: number
    if (row) {
      userId = row.id
      db.prepare(
        `UPDATE users SET google_sub = COALESCE(google_sub, ?),
           name = COALESCE(name, ?), avatar_url = COALESCE(avatar_url, ?)
         WHERE id = ?`,
      ).run(sub, payload.name ?? null, payload.picture ?? null, userId)
    } else {
      const info = db
        .prepare(
          'INSERT INTO users (email, password_hash, google_sub, name, avatar_url, created_at) VALUES (?, NULL, ?, ?, ?, ?)',
        )
        .run(normalizedEmail, sub, payload.name ?? null, payload.picture ?? null, new Date().toISOString())
      userId = Number(info.lastInsertRowid)
    }

    setAuthCookie(req, res, userId)
    res.redirect('/')
  } catch (err) {
    next(err)
  }
})

export default router
