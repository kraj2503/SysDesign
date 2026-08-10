import './env' // must be first: loads .env before anything reads process.env
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initSchema } from './db'
import healthRouter from './routes/health'
import topicsRouter from './routes/topics'
import quizRouter from './routes/quiz'
import progressRouter from './routes/progress'
import caseStudiesRouter from './routes/caseStudies'
import importRouter from './routes/import'
import authRouter from './routes/auth'

initSchema()

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = resolve(__dirname, '../../client/dist')

const isProd = process.env.NODE_ENV === 'production'

const app = express()

// Behind nginx/Cloudflare, X-Forwarded-For reflects the real client IP. Trusting the
// first hop only (the local proxy) lets rate limiting and req.secure see real clients.
// Only enable in production — in dev the Vite proxy is on localhost and trusting the
// header would let a client spoof its own IP to dodge rate limits.
if (isProd) app.set('trust proxy', 1)

// Security headers (CSP, nosniff, HSTS, X-Frame-Options, …). COEP is disabled because
// the page loads Google Fonts cross-origin; frame-ancestors 'none' blocks clickjacking.
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    // HSTS: enforce HTTPS for 1 year, include subdomains, allow preload
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        // Prevent MIME sniffing and add referrer policy
        // Note: Helmet's referrerPolicy middleware handles Referrer-Policy header separately
      },
    },
    // Explicitly set referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Prevent MIME type sniffing
    noSniff: true,
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Hide X-Powered-By header
    hidePoweredBy: true,
  }),
)

// CORS is locked to an explicit allowlist. Same-origin requests (no Origin header) are
// always fine — which covers production single-origin and the Vite dev proxy. Anything
// else must match an entry in CORS_ORIGINS (comma-separated, e.g. https://app.example.com).
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(null, false)
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Brute-force / abuse protection. Auth and import are the write-heavy, attacker-facing
// surfaces; a generous global limiter blunts simple flooding without touching real users.
// Rate limiter key generator that respects trust proxy setting and handles IPv6 correctly
// using express-rate-limit's built-in ipKeyGenerator helper.
function getClientIp(req: express.Request): string {
  // Use the library's helper to properly handle IPv6 addresses
  const ip = ipKeyGenerator(req)
  if (isProd) {
    // In production, trust proxy is enabled so req.ip reflects X-Forwarded-For
    return ip
  }
  // In dev, ignore X-Forwarded-For header entirely — use socket address only
  return req.socket.remoteAddress || 'unknown'
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down and try again.' },
  keyGenerator: getClientIp,
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50, // 50 sign-in attempts per 15 min per IP is generous for humans
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts — try again later.' },
  keyGenerator: getClientIp,
})
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many imports — try again later.' },
  keyGenerator: getClientIp,
})

app.use('/api', globalLimiter)
app.use('/api/auth', authLimiter)
app.use('/api/import', importLimiter)

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/topics', topicsRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/progress', progressRouter)
app.use('/api/case-studies', caseStudiesRouter)
app.use('/api/import', importRouter)

// Unknown API paths → JSON 404 (never the HTML SPA fallback).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Production: serve the built client and fall back to index.html for client routes
// (must come after /api routes so unknown API paths still 404/error as JSON).
const serveStatic = isProd || Boolean(process.env.CLIENT_DIST)
if (serveStatic) {
  if (existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST))
    app.use((req, res, next) => {
      // SPA fallback for client-side routes; skip /api and missing asset paths
      // (those should 404 instead of returning index.html with the wrong MIME type).
      if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.includes('.')) return next()
      res.sendFile(resolve(CLIENT_DIST, 'index.html'))
    })
  } else {
    console.warn(`[api] client dist not found at ${CLIENT_DIST} — static serving disabled`)
  }
}

// Final error handler. Log the real error for ops; never leak internals (SQL, stack,
// file paths) to clients in production.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api]', err)
  if (res.headersSent) {
    return
  }
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ error: isProd ? 'Internal server error' : message })
})

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`SysDesignLab API listening on http://localhost:${PORT}`)
})
