# Deploy SysDesignLab on Oracle Cloud (Always Free)

Your app runs **unchanged** on a free always-on Oracle VM: Express + `better-sqlite3` +
the built client, all on one origin. This page walks the two halves — the Oracle console
part (you, ~15 min) and the deploy script (one command).

> **Before you start** — Oracle's signup needs a credit/debit card for identity
> verification (~$1 temporary hold, refunded). You will **never be charged** as long as
> you stay on Always Free resources. If you don't have any card, this path won't work —
> say so and we'll switch to a card-free option (Neon + Vercel/Supabase).

---

## Part A — Oracle console

### A1. Sign up
1. Go to <https://signup.cloud.oracle.com/> and create an account.
2. Pick your **home region** — this cannot change later, so choose the closest:
   India → **Mumbai** or **Hyderabad**; Singapore/SEA → **Singapore**; US → us-ashburn/phoenix.
3. Card check happens here. If it fails or the account gets stuck in "provisioning",
   retry in ~30 min (this is the flakiest step; it usually resolves).

### A2. Create the VM
1. Console → **Compute → Instances → Create instance**.
2. Name: `sysdesignlab`.
3. **Image**: `Canonical Ubuntu 22.04` (LTS). **Shape**: `VM.Standard.A1.Flex` (Ampere ARM)
   — this is the free one. Allocate **4 OCPU / 24 GB** (the free maximum).
4. **SSH keys**: on your Mac run
   `ssh-keygen -t ed25519 -f ~/.ssh/sysdesignlab -C "sysdesignlab"` (or reuse an existing
   key). Paste the **public** key (`~/.ssh/sysdesignlab.pub`) into the box.
5. Leave boot volume at its default (47 GB, free). Click **Create**.
6. **Capacity**: if you get "out of capacity", lower to 2 OCPU/12 GB, or change the
   availability domain, or retry later. Persistence wins.

### A3. Open ports (this is the firewall — nothing else blocks traffic)
1. **Networking → Virtual cloud networks →** your VCN → **Security Lists →** the default one.
2. **Add Ingress Rules** (leave source `0.0.0.0/0`):
   | Port | Purpose |
   |---|---|
   | `22` | SSH (usually already there) |
   | `80` | HTTP — **required** |
   | `443` | HTTPS — add now if you'll attach a domain |
3. Note the instance's **Public IP** from the instance page.

### A4. Quick sanity check
```bash
ssh -i ~/.ssh/sysdesignlab ubuntu@<PUBLIC_IP> "echo connected && uname -m && free -h | head -2"
```
(If you reused another key, drop the `-i`.)

---

## Part B — deploy (one command)

### B1. Copy the code from your Mac
From the repo root on your Mac:

```bash
# create the target dir owned by your ssh user first
ssh -i ~/.ssh/sysdesignlab ubuntu@<PUBLIC_IP> "sudo mkdir -p /opt/sysdesignlab && sudo chown ubuntu /opt/sysdesignlab"

# sync the repo (excludes node_modules, git, local DB, local .env)
rsync -avz --delete \
  --exclude node_modules --exclude .git --exclude client/dist \
  --exclude server/data --exclude .env \
  -e "ssh -i ~/.ssh/sysdesignlab" \
  ./ ubuntu@<PUBLIC_IP>:/opt/sysdesignlab/
```

### B2. Run the deploy script
```bash
ssh -i ~/.ssh/sysdesignlab ubuntu@<PUBLIC_IP> "sudo bash /opt/sysdesignlab/deploy/deploy.sh"
```
It installs Node 22 + nginx, `npm install`, builds the client, generates a
`SESSION_SECRET`, seeds the DB (first run only), and starts a systemd service.

### B3. Open it
`http://<PUBLIC_IP>/` — register a user, take a quiz, confirm progress saves.

---

## Day-to-day

| Thing | Command |
|---|---|
| See the live logs | `ssh ... "journalctl -u sysdesignlab -f"` |
| Restart the app | `ssh ... "sudo systemctl restart sysdesignlab"` |
| Push an update | re-run the `rsync` in B1, then `sudo bash deploy/deploy.sh` |
| Back up user data | `sudo tar czf /opt/sysdesignlab/backup-$(date +%F).tar.gz -C /opt/sysdesignlab server/data` |

Deploy is idempotent: it **keeps** your `.env` (SESSION_SECRET) and **never reseeds** an
existing DB, so user accounts/progress survive re-deploys.

---

## Optional: domain + HTTPS (needed for Google OAuth)

A bare IP works, but Google OAuth requires a real callback URL over HTTPS. When you have
a domain:

1. Point an **A record** at `<PUBLIC_IP>`.
2. Install certbot and get a cert:
   ```bash
   ssh ... "sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d your-domain.com"
   ```
   certbot rewrites the nginx site to listen on 443 and sets `X-Forwarded-Proto: https`,
   so the app's auth cookie becomes `Secure` automatically (no code change needed).
3. Put your Google OAuth values in `/opt/sysdesignlab/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
   ```
   and add that exact URI as an authorized redirect in the Google Cloud console.
4. `sudo systemctl restart sysdesignlab`.

---

## Notes & caveats

- **Always Free is not a trial** — it stays free, but resources are reclaimed if you
  create paid/Always-Free *overage* resources. You only used the A1 instance, so fine.
- **Prebuilt binaries**: `better-sqlite3` ships prebuilt Linux/ARM64 binaries for Node 22;
  if the version ever lacks one, `build-essential` + `python3` are already installed so it
  compiles from source.
- **Data lives in `/opt/sysdesignlab/server/data/sysdesign.db`** — that's your users'
  progress. The boot volume is persistent, but do the backup command above occasionally.
- Cold-start time is irrelevant (always-on VM); 4 OCPU/24 GB is ~100x more than this app
  needs.
