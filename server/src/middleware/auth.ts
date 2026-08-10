// JWT auth helpers + Express middleware.
// Tokens are carried in an HttpOnly cookie (`token`); user id is attached as req.userId.
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

const isProd = process.env.NODE_ENV === 'production'
if (!process.env.SESSION_SECRET) {
  if (isProd) {
    throw new Error('SESSION_SECRET must be set when NODE_ENV=production')
  }
  // Dev: generate an ephemeral secret on each startup so dev tokens are never reused across restarts
  // and can't be confused with production tokens. This also prevents accidental prod deploys without a secret.
  const { randomBytes } = await import('node:crypto')
  const ephemeralSecret = randomBytes(32).toString('hex')
  console.warn('[auth] DEV MODE: Using ephemeral JWT secret. Set SESSION_SECRET for persistent sessions.')
  process.env.SESSION_SECRET = ephemeralSecret
}

const SESSION_SECRET = process.env.SESSION_SECRET!
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, SESSION_SECRET, { expiresIn: '30d' })
}

// Only mark the cookie Secure when the request actually arrived over HTTPS.
// Behind nginx/Cloudflare the X-Forwarded-Proto header reflects the real scheme,
// so this works for both plain-HTTP (bare IP) and HTTPS (domain) deployments.
function isSecureRequest(req: Request): boolean {
  return req.secure || req.get('x-forwarded-proto') === 'https'
}

export function setAuthCookie(req: Request, res: Response, userId: number): void {
  res.cookie('token', signToken(userId), {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd && isSecureRequest(req),
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearAuthCookie(req: Request, res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd && isSecureRequest(req),
    path: '/',
  })
}

// --- Quiz session tokens ---
// The quiz endpoint serves a random subset of questions and hands the client a signed,
// short-lived token binding that exact subset to the user + topic. Submission and
// per-question checks must present the token, so a client can't reorder the questions,
// swap in easier ones, or report a fabricated score.

export interface QuizTokenPayload {
  uid: number
  tid: number
  ids: number[]
}

export function signQuizToken(uid: number, tid: number, ids: number[]): string {
  return jwt.sign({ uid, tid, ids }, SESSION_SECRET, { expiresIn: '30m' })
}

export function verifyQuizToken(token: string): QuizTokenPayload | null {
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as {
      uid?: unknown
      tid?: unknown
      ids?: unknown
    }
    if (typeof payload.uid !== 'number' || typeof payload.tid !== 'number' || !Array.isArray(payload.ids)) {
      return null
    }
    const ids = payload.ids
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0)
    if (!ids.length || ids.some((n) => !Number.isInteger(n))) return null
    return { uid: payload.uid, tid: payload.tid, ids }
  } catch {
    return null
  }
}

function readUserId(req: Request): number | undefined {
  const token = req.cookies?.token as string | undefined
  if (!token) return undefined
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as { sub?: string }
    return payload.sub ? Number(payload.sub) : undefined
  } catch {
    return undefined
  }
}

// 401 unless a valid session cookie is present.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = readUserId(req)
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  req.userId = userId
  next()
}

// Set req.userId when a valid session exists, but never reject.
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  req.userId = readUserId(req)
  next()
}
