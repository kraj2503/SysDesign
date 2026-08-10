# SysDesignLab — Production Deployment Checklist

## ✅ Pre-deployment (from your Mac)

- [ ] **Build passes locally**: `npm run build` → `vite: build ok`
- [ ] **Type checks pass**: `cd server && npx tsc --noEmit` (no errors)
- [ ] **Seed works**: `npm run seed` (recreates DB with 13 topics, 169 questions, 12 case studies)
- [ ] **Dev server runs**: `npm run dev` → API :4000 + client :5173 both respond 200

## 📋 On the Oracle VM (after SSH)

### 1. Copy code to VM
```bash
# From your Mac (repo root):
ssh -i ~/.ssh/sysdesignlab ubuntu@<PUBLIC_IP> "sudo mkdir -p /opt/sysdesignlab && sudo chown ubuntu /opt/sysdesignlab"

rsync -avz --delete \
  --exclude node_modules --exclude .git --exclude client/dist \
  --exclude server/data --exclude .env \
  -e "ssh -i ~/.ssh/sysdesignlab" \
  ./ ubuntu@<PUBLIC_IP>:/opt/sysdesignlab/
```

### 2. Create production .env
```bash
ssh -i ~/.ssh/sysdesignlab ubuntu@<PUBLIC_IP>
sudo -i
cd /opt/sysdesignlab

# Copy template and edit
cp .env.production .env
# Edit .env and fill in:
# - SESSION_SECRET (generate: openssl rand -hex 32)
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI (if using OAuth)
vim .env
chmod 600 .env
```

### 3. Run deploy script
```bash
sudo bash deploy/deploy.sh
```

### 4. Verify
- Visit `http://<PUBLIC_IP>/` — should load the app
- Register a test user → take a quiz → confirm progress saves
- Check logs: `journalctl -u sysdesignlab -f`

---

## 🔐 HTTPS + Google OAuth (required for Google sign-in)

**OAuth only works on HTTPS** — you need a real domain.

```bash
# 1. Point A record: your-domain.com → <PUBLIC_IP>

# 2. Get TLS cert (certbot auto-updates nginx config)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 3. Update .env with your domain
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback

# 4. Add same redirect URI in Google Cloud Console → Credentials

# 5. Restart
sudo systemctl restart sysdesignlab
```

---

## 📦 Post-deploy Operations

| Task | Command |
|------|---------|
| View live logs | `journalctl -u sysdesignlab -f` |
| Restart app | `sudo systemctl restart sysdesignlab` |
| Re-deploy after code push | Re-run rsync, then `sudo bash deploy/deploy.sh` |
| Backup user data | `sudo tar czf /opt/sysdesignlab/backup-$(date +%F).tar.gz -C /opt/sysdesignlab server/data` |
| Check service status | `systemctl status sysdesignlab nginx` |

---

## ⚠️ Important Notes

1. **Deploy is idempotent** — re-running `deploy.sh` preserves:
   - `.env` (your `SESSION_SECRET`, Google keys)
   - SQLite DB (`server/data/sysdesign.db`) — user accounts, progress, quiz history

2. **Never re-seed in production** — the deploy script only seeds if DB doesn't exist

3. **Google OAuth requires HTTPS** — bare IP won't work for Google sign-in

4. **Client is served by Express** — nginx just proxies. The SPA fallback is in `server/src/index.ts`

5. **Auth cookies** — in production they're `Secure; SameSite=Strict; HttpOnly` (see `server/src/middleware/auth.ts`)

---

## 🆘 Troubleshooting

| Symptom | Fix |
|---------|-----|
| "SESSION_SECRET must be set" | Check `.env` exists and has `SESSION_SECRET=...` |
| 502 Bad Gateway | `journalctl -u sysdesignlab -f` — check if API is running on :4000 |
| OAuth redirects to HTTP | Ensure nginx sends `X-Forwarded-Proto: https` (certbot does this) |
| "Google sign-in failed" | Verify `GOOGLE_REDIRECT_URI` matches Google Console exactly |
| DB locked / migrations fail | Stop service: `systemctl stop sysdesignlab`, check no other process holds DB |

---

**Generated files:**
- `.env.production` — template for production `.env`
- This checklist: `PRODUCTION_CHECKLIST.md`