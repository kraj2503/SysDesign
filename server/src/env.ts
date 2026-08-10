// Load a root .env file if present (Node >= 20.12). Import this module FIRST so
// process.env is populated before any other module reads configuration.
// Tries the process cwd (.env) and the monorepo root (.env at ../../).
import process from 'node:process'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const candidates = [resolve(process.cwd(), '.env'), resolve(__dirname, '../../.env')]

for (const candidate of candidates) {
  if (!existsSync(candidate)) continue
  try {
    process.loadEnvFile?.(candidate)
  } catch {
    // ignore malformed .env
  }
  break
}
