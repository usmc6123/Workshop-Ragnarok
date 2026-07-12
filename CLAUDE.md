# Workshop: Ragnarök — Architecture & Deployment Reference

This file exists so any future Claude session (Cowork or Claude Code) opened in this
repo has full context immediately, without the owner having to re-explain the deploy
pipeline or re-diagnose bugs that were already solved. Read this first.

## What this app is

Workshop: Ragnarök is a real auto shop management web app, deployed on the owner's
home server via Docker/WSL2. It's edited two ways:
1. **Google AI Studio** — has a limited Pro quota, edits pushed via GitHub Desktop.
2. **Claude / Cowork** — direct file access to this repo on disk (D:\HomeServer\workshop-ragnarok),
   plus a bash sandbox that mounts the same folder for running commands.

If you make changes here via Claude and the owner later wants to keep editing in AI
Studio, the only thing they need to do is re-sync AI Studio with whatever files
changed — no other handoff step needed.

## App architecture & features

**Stack:** React 19 + TypeScript + Vite 6 + Tailwind CSS 4 on the frontend. It's a
single-page app with state-based view switching in `src/App.tsx` — there's no
react-router, just a `view` state variable that swaps between named view components.
Backend is Express 4 + `better-sqlite3` (SQLite), with JWT auth (`jsonwebtoken` +
`bcryptjs`), mostly defined in `backend/server.js` plus a few split-out files.

**Integrations:**
- **Stripe** — payments/checkout (`backend/stripe.js`), webhook at `/api/webhooks/stripe`
- **Resend** — outbound email send + inbound email webhook with Svix signature
  verification (`backend/email.js`)
- **Google GenAI** (`@google/genai`) — powers the "Cooper & Roscoe" AI shop assistant
  in `ChatWidget.tsx`, backend route in `backend/chat-route.js`
- **cheerio + node-fetch** — manual/invoice scraping and ingestion (`backend/ingestion.js`)
- **three.js** — the animated cat login screen (`LoginCats3D.tsx`)
- **motion** (Framer Motion) — general UI animation

**Pages** (`src/components/*View.tsx`, routed in `src/App.tsx`, nav list in
`src/components/Sidebar.tsx`):
- Dashboard — stats/overview, video hero banner
- Customers — CRM profiles, video hero banner (`CustomersHeaderVideo.tsx`)
- Vehicles — fleet profiles, video hero banner (`VehiclesHeaderVideo.tsx`)
- Jobs / Work Orders — job tracking with notes/parts/photos/services sub-resources,
  Stripe checkout session creation, customer-portal link generation
- Inventory — parts stock, adjustments, AI-assisted invoice parsing
- Calendar — appointments
- Manual Library (`BrowseView.tsx` + `ManualView.tsx`) — vehicle service manuals,
  populated via `ingestion.js`
- Email — Resend-backed inbox, templates, trash; the Customers page can deep-link
  into a quick-compose here
- Automations
- Payments — Stripe-backed, receipts
- Settings — shop-wide settings
- Manage Users / Admin (admin-only, JWT-protected) — `pages/AdminPage.tsx`
- Customer Portal (`CustomerPortalView.tsx`) — separate external-facing view reached
  via generated links (`backend/portal-routes.js`), not the internal shop UI
- Login (`pages/LoginPage.tsx`) — 3D animated cat login screen
- `ChatWidget.tsx` — floating AI shop assistant, present on every page. **This file
  is on the protected list** (see below) — edits need the mirror-first push.

**Backend API surface** (`backend/server.js`, everything under `/api`): standard
CRUD-ish routes for customers, vehicles (plus per-customer vehicle lists and
makes/models/years lookups), jobs (plus notes/parts/photos/services sub-routes),
inventory (plus stock-adjust and AI invoice parsing), appointments, vehicle-manuals,
garage, services, service-history, receipts, payments, shop-settings,
email-templates, emails (received/trash/send), auth (login/me/users), stats
(dashboard numbers), an image proxy, plus the Stripe and inbound-email webhooks.

**Data:** SQLite at `/data/db/workshop.db` inside the container, mounted from the
repo's `data/` directory — this is exactly the directory the webhook's
`git clean --exclude=data/` step preserves across every deploy, so the database
survives resets. `backend/db.js` owns the connection/schema.

**File uploads:** everything under `/uploads/*` (job note attachments, receipts,
and general media uploads from `POST /api/uploads`) is written to `/data/uploads/`,
NOT `backend/uploads/` — same `/data` bind mount as the database, for the same
reason: it's the one directory that survives both `git clean` on deploy AND full
container recreation (which now also happens automatically ~90s after every boot,
via the webhook's self-heal — see "Host environment" below). This was fixed
2026-07-12; before that, uploaded files lived in the container's own ephemeral
writable layer and were silently wiped on every deploy/recreate — a real
pre-existing bug that the self-heal fix made trigger far more often. `POST
/api/uploads` (added 2026-07-12) is the generic upload endpoint backing every
"Upload" button in the app (Sites block editor, Funnels editor, Settings shop
logo) — shared frontend component is `src/components/MediaField.tsx`, shared
backend logic lives right after the DB-init block in `backend/server.js`. Image
uploads cap at 20MB, video at 100MB; the global `express.json()` body limit is
450mb to accommodate base64-encoded video (both the normal upload cap and the
larger "Reformat" input cap below).

**Reformat tool (added 2026-07-12):** every `MediaField` also has a "Reformat"
button for shrinking an oversized file (up to 300MB raw) down to something that
fits the upload caps, then it uploads the result automatically. Images downscale
client-side via canvas (pick a max dimension, 400-3000px) — no server involved.
Video is re-encoded server-side via **ffmpeg**, which is installed in
`backend/Dockerfile`'s runtime stage (`apt-get install ffmpeg` — this file is on
the protected list, so this was a mirror-first change).

Upload/reformat transport was rewritten 2026-07-12 from base64-in-JSON to
`multipart/form-data` (`multer` + `FormData`) after a browser "Out of Memory"
crash — see bug log entry 7 above.

The video reformat path was reworked again the same day into a **two-phase
polling job** so the frontend can show a real percentage instead of just a
spinner: `POST /api/uploads/compress-video` in `backend/server.js` now uploads
the file, returns `{ jobId }` almost immediately, and keeps encoding in the
background (`ffmpeg` run via `child_process.spawn`, not `execFile`, so its
stdout can be read as a live stream); progress lives in an in-memory
`compressJobs` Map keyed by jobId, cleaned up ~10 minutes after completion.
`GET /api/uploads/compress-video/:jobId` is polled every ~1s from the frontend
(`api.startVideoCompress` + `api.getVideoCompressStatus` in `src/lib/api.ts`)
to drive an actual progress bar in `MediaField.tsx`. The real percentage comes
from ffmpeg's own `-progress pipe:1 -nostats` output (`out_time_us` field)
divided by the input's duration (read upfront via `ffprobe`, which ships
alongside `ffmpeg` from the same apt package — no separate Dockerfile change
needed). Targets 480p/720p/1080p via `-vf scale=-2:<height>` + libx264
`-crf 28 -preset veryfast`.

**Raw-input cap raised to 2GB (2026-07-12).** `REFORMAT_MAX_RAW_INPUT_BYTES` in
both `backend/server.js` and `src/components/MediaField.tsx` — this was always
just an app-level number we picked, not an infra limit (Cloudflare's cap only
applies going over the public domain; over LAN/Tailscale the only real ceiling
is temp disk space and encode time). The raw input never gets served to
anyone — it's deleted right after encoding — so a large source file (e.g. raw
4K phone footage) just produces a normal small output once scaled down to
480/720/1080p; the two aren't related. Paired with this, the ffmpeg encode
timeout is no longer a flat 15 minutes — it now scales off the video's actual
probed duration (`durationMs * 4`, floor 15min, ceiling 90min), so raising the
size cap again later won't also require remembering to bump a hardcoded
timeout by hand.

## The two repos

1. **usmc6123/Workshop-Ragnarok** (this repo) — the actual app, frontend + backend.
   This is what actually gets deployed.
2. **usmc6123/images**, folder `workshop-core/` — a separate "mirror" repo. It holds
   trusted backup copies of a specific list of critical files. It exists purely as a
   restore source used automatically on every deploy — NOT a general asset repo.

## The deploy pipeline

A GitHub webhook fires on every push to this repo's `main` branch, hitting
`/opt/workshop-webhook/webhook.js` on the host. In order, it:

1. `git fetch origin main && git reset --hard origin/main && git clean -fd --exclude=data/ --exclude=.env`
   — resets this repo's working copy to match whatever's committed on `main`,
   wiping local drift but preserving the SQLite data dir and `.env`.
2. `restoreCoreFiles()` — for each file in a hardcoded list (~24 entries, see below),
   runs `wget -q -O <dest> <raw.githubusercontent.com mirror URL>`, **overwriting the
   just-reset file with whatever is currently committed in the images mirror repo**,
   regardless of what's committed here in Workshop-Ragnarok.
3. `docker compose build workshop-backend`
4. Stop, remove, and re-run the `workshop-backend` container
5. Run `post-rebuild.sh`

## The rule that actually matters: push order

Because step 2 unconditionally overwrites protected files from the mirror on every
single deploy:

- **Push the `images` mirror repo FIRST.**
- **Then push Workshop-Ragnarok** — this is what fires the webhook.
- If you push Workshop-Ragnarok first, the webhook fires immediately and restores
  from the still-stale mirror, undoing your fix before you get a chance to push it.

This is also the entire explanation for why protected files "keep reappearing as
changed" in GitHub Desktop — the webhook silently rewrites them on disk after every
deploy, independent of what's actually committed to this repo's own git history.

**Any edit to a file on the protected list must be made in BOTH repos to actually
stick**, mirror first.

## The protected files list

Source of truth: `/opt/workshop-webhook/webhook.js` on the host — NOT any copy of
webhook.js that might be sitting inside the images mirror repo itself, which can be
stale. As of mid-2026:

```
lemon-website          → lemon-server/lemon-website           (chmod +x)
Dockerfile              → lemon-server/Dockerfile
ingestion.js            → backend/ingestion.js
post-rebuild.sh         → post-rebuild.sh                      (chmod +x)
package-lock.json       → package-lock.json
backend-package-lock.json → backend/package-lock.json
docker-compose.yml      → docker-compose.yml
GEMINI.md               → GEMINI.md
backend-Dockerfile      → backend/Dockerfile
chat-route.js           → backend/chat-route.js
db.js                   → backend/db.js
ChatWidget.tsx          → src/components/ChatWidget.tsx
chat-background.png     → public/chat-background.png
cooper-logo.png         → public/cooper-logo.png
roscoe-logo.png         → public/roscoe-logo.png
garage-calm.mp4         → public/garage-calm.mp4
garage-run.mp4          → public/garage-run.mp4
jobs-calm.mp4           → public/jobs-calm.mp4
jobs-buff.mp4           → public/jobs-buff.mp4
vehicle-calm.mp4        → public/vehicle-calm.mp4
vehicle-run.mp4         → public/vehicle-run.mp4
slogan-frame.png        → public/slogan-frame.png             (listed twice, harmless dupe)
stat-plate-frame.png    → public/stat-plate-frame.png          (listed twice, harmless dupe)
customer-calm.mp4       → public/customer-calm.mp4             (added mid-2026)
customer-run.mp4        → public/customer-run.mp4              (added mid-2026)
```

## Docker build architecture

`backend/Dockerfile`, two stages, both currently on `node:22-slim` (upgraded from
`node:18-slim` — see bug #4 below for why):
- Stage 1 `frontend-builder`: builds the Vite/React frontend (`npm install` + `npm run build`)
- Stage 2: final backend runtime image (`npm ci --only=production`, copies backend
  source + Stage 1's `dist/` output)

`docker-compose.yml` (repo root) defines 3 services:
- `lemon-server`
- `workshop-backend` — built from `backend/Dockerfile`, context `.`
- `webhook` — built from `/opt/workshop-webhook` on the host, mounts
  `/mnt/d/HomeServer/workshop-ragnarok:/workspace` — this IS the literal deploy
  workspace, the same folder Claude/Cowork sees as D:\HomeServer\workshop-ragnarok.

`.dockerignore` exists at repo root — excludes `node_modules`, `.git`, `data/`,
`dist`, `*.md`, etc. Saves ~730MB of build context per build. If it's ever missing,
re-add it; without it every build sends the full repo including node_modules/.git/data.

The **live container name is `ragnarok-backend`**, not `workshop-backend` — that's
just the compose *service* name. `docker compose stop/rm workshop-backend` can fail
to find it; use `docker stop ragnarok-backend && docker rm ragnarok-backend` directly
by container name if that happens, then `docker compose up -d workshop-backend`.

**Build speed:** routine deploys (small source edits, no dependency/Dockerfile
changes) are fast — around 1-2 minutes — because Docker reuses cached layers for
`apt-get install`, `npm install`/`npm ci`, and the base image pull, only re-running
the steps that actually changed (frontend transform + copy). The ~45+ minute builds
seen during the Node 18→22 / dependency-fix debugging chain were `--no-cache` runs,
which force every layer to rebuild from scratch — that's expected and only needed
when verifying whether a Dockerfile/dependency fix actually landed, not normal
day-to-day behavior. Don't mistake a slow `--no-cache` verification build for a sign
that something's newly broken.

## Bug log — real issues already diagnosed and fixed (don't re-diagnose from scratch)

1. **Missing native binding for `@tailwindcss/oxide`** ("npm has a bug related to
   optional dependencies", npm/cli#4828). Fix: full clean reinstall
   (`rm -rf node_modules package-lock.json && npm install`), propagate the corrected
   `package-lock.json` to BOTH repos (mirror first).

2. **`npm install -g npm@latest` failing.** npm 12.0.0 requires Node ≥22, incompatible
   with `node:18-slim`. Became moot once the base image was upgraded to
   `node:22-slim` — the npm-upgrade step was removed from the Dockerfile entirely.

3. **Docker layer cache masking whether a fix actually landed.** `docker compose
   build` can report a step as `CACHED` even when the underlying file changed.
   Always verify with `docker compose build --no-cache <service> --progress=plain
   2>&1 | tee <logfile>` — this is also the only way to see the FULL error; the
   webhook's own error capture only shows the final "failed to solve" line, never
   the real cause above it.

4. **Root cause of the tailwindcss/genai/vite-plugin-react failures: Node 18 itself,
   not npm.** `@tailwindcss/oxide@4.3.2`, `@google/genai`, and
   `@vitejs/plugin-react@5.2.0` all require Node ≥20; `node:18-slim` was already past
   EOL. Fixed by upgrading both Dockerfile stages to `node:22-slim`.

5. **730MB build context on every build, no `.dockerignore`.** Added one (see above).

6. **ChatWidget.tsx recurring truncation — the big one.** Looked for a long time like
   network/CDN flakiness: the exact same truncation point via `wget`, `web_fetch`,
   even a SHA-pinned URL. It was NOT a network issue. The actual committed content in
   the images mirror repo, commit `7d715ad` ("changes yo"), was genuinely truncated —
   a `referrerPolicy` edit got half-written and committed that way. Every `wget` was
   faithfully downloading a broken source, every time. What finally cracked it:
   cloning the mirror repo fresh and running `git log --oneline -- <path>` plus
   `git show <commit>:<path> | wc -l` across the file's commit history, comparing
   line counts to find the last fully-intact version. Fixed by reconstructing the
   file from the last known-good commit plus the same `referrerPolicy` additions
   reapplied cleanly, written directly to both repos.
   **Lesson: if a file looks corrupted at the exact same byte position on every
   fetch, check `git log`/`git show` on the source repo before assuming it's a
   download/CDN/tooling problem — the "source of truth" itself may be the thing
   that's actually broken.**

7. **Reformat tool crashed the Chrome tab with "Out of Memory" on video files.**
   Root cause: the upload/reformat transport encoded files as base64 via
   `FileReader.readAsDataURL()` then `JSON.stringify()`'d that into the fetch
   body — for a ~300MB video this creates multiple full in-memory string copies,
   ballooning to 1.5-2GB+ of browser heap. Fixed by switching the entire
   transport to `multipart/form-data`: frontend builds a `FormData` and sends
   the raw `File`/`Blob` (`api.uploadMedia(file, fileName)` and
   `api.compressVideo(file, fileName, targetResolution)` in `src/lib/api.ts`,
   both now taking a `Blob` instead of a base64 string), backend receives it via
   `multer.diskStorage` (`POST /api/uploads` and `POST /api/uploads/compress-video`
   in `backend/server.js`) which streams straight to disk without buffering the
   whole file as a string. `MediaField.tsx`'s image-compression path was updated
   to match: `compressImage()` now takes a `File` and returns a `Blob` via
   `canvas.toBlob()` (using `URL.createObjectURL()` to load the source image),
   instead of a base64 data URL via `canvas.toDataURL()`. `express.json()`'s body
   limit was lowered back from 450mb to 20mb since large files no longer touch
   that parser at all. Added `multer` to `backend/package.json` — this needs
   `npm install` run in `backend/` to regenerate `backend/package-lock.json`
   (a protected file, mirror-first push required) before this can deploy.
   **Lesson: never round-trip a large file through a base64 string + JSON for
   upload — always use `FormData`/multipart so the browser streams it instead
   of materializing it as a string in memory.**

8. **Reformat/upload fails inconsistently ("Failed to fetch" or a client-side
   timeout) on large video files (~200MB+), but only when accessed via the
   public domain — not over LAN.** Root cause: the public domain routes through
   a `cloudflared` Tunnel, and Cloudflare's own edge proxy caps request body
   size — 100MB on the Free plan, 200MB on Pro — silently dropping/resetting
   the connection for anything larger, rather than returning a clean error.
   This is why the symptom varies (sometimes an immediate "Failed to fetch",
   sometimes our own client-side upload timeout firing instead) — Cloudflare
   doesn't give the browser a normal HTTP response to work with either way.
   **Important: Tunnel-backed hostnames can't be set to "DNS only" (grey-cloud)
   to bypass this** — a Cloudflare Tunnel hostname is a CNAME to
   `<tunnel-id>.cfargotunnel.com` and only resolves/routes while proxied
   (orange-cloud), so the usual "just disable the proxy" workaround doesn't
   apply here. Until/unless the Cloudflare plan is upgraded, the practical
   workaround for reformatting very large raw video files is to do it from the
   shop's own LAN (direct IP:port to `ragnarok-backend`, bypassing Cloudflare
   entirely) rather than over the public domain. Also fixed in the same pass:
   `request()` in `src/lib/api.ts` used to show a hardcoded "Invoice parsing
   with Gemini can take 15-30 seconds" message on every timeout, regardless of
   which endpoint actually timed out — it now takes an optional
   `timeoutMessage` param so each caller (`parseInvoice`, `uploadMedia`,
   `startVideoCompress`) surfaces an accurate, endpoint-specific message.
   `startVideoCompress`'s own timeout was also raised from 5 to 20 minutes,
   since that's a real bottleneck independent of the Cloudflare cap on a slow
   home upload connection for files under the cap.
   **Lesson: an inconsistent, response-less failure ("Failed to fetch") on
   large uploads through a public/proxied domain is a strong signal to check
   the proxy layer's own body-size limits before assuming it's an app bug —
   especially with Cloudflare, which drops oversized requests without a clean
   error the app could catch and explain.**

## Tooling lessons (for future Claude sessions specifically)

- The bash sandbox's mounted view of these Windows folders can be **stale/cached**
  relative to what Read/Write/Edit see, even seconds after a Write. Don't use
  `bash cp` to move or verify files between the two repo folders — use Read/Write/Edit
  directly.
- `mcp__workspace__web_fetch` and `wget` from the bash sandbox are **not reliable**
  for verifying `raw.githubusercontent.com` content — the sandbox has its own
  outbound network/proxy restrictions unrelated to GitHub's actual behavior (seen:
  a `403 blocked-by-allowlist`, and separately a clean 0-byte failure with no real
  network reached).
- `git clone` via bash has been 100% reliable for checking real committed repo
  content all session. When something looks corrupted, clone fresh and check
  history rather than trusting a single raw-URL fetch.

## Host environment: shared homelab stack (read if anything Docker/WSL-related looks wrong)

Ragnarök's `ragnarok-backend` and `workshop-webhook` containers run on the same
physical machine, same WSL2 instance, and same Docker Desktop as the owner's much
larger homelab stack. That stack is defined in a **separate** compose file at
`D:\HomeServer\docker-compose.yml` (root of D:, not inside this repo) — currently
~20 services: `gluetun`, `seerr`, `sonarr`, `radarr`, `bazarr`, `prowlarr`,
`flaresolverr`, `lidarr`, `qbittorrent`, `sabnzbd`, `lazylibrarian`, `portainer`,
`tautulli`, `wizarr`, `watchtower`, `nginx-proxy-manager`, `nginx-db`, `n8n`,
`n8n-postgres`, `homarr`, `cloudflared`. All its bind-mount volume paths use
**WSL-style `/mnt/d/...` syntax, not Windows-style `D:\...`** — this is required,
not stylistic: `docker compose` invoked from the WSL/Ubuntu-24.04 bash terminal
throws `invalid volume specification` on Windows-style paths. Confirmed by testing;
don't "fix" these to `D:\...` again.

There are also several other completely separate stacks/containers on the same
host, unrelated to the compose file above: `nextcloud_app`/`nextcloud_db`/
`nextcloud_redis`, `pihole`, `mealie`, `uptime-kuma`, `immich_server`/
`immich_machine_learning`/`immich_postgres`/`immich_redis`, and `kometa` (this one
was created via a bare `docker run`, not any compose file — no
`com.docker.compose.project` label, uses a Docker-managed named volume
`kometa_config` rather than a bind mount, and had `RestartPolicy: no` until fixed
via `docker update --restart unless-stopped kometa` on 2026-07-11). A small
separate `seerr-wrapper` proxy (`D:\HomeServer\seerr-wrapper`, service
`seerr-tv`, port 3000) also exists — owner has explicitly said to ignore it and
`gluetun` unless he raises them again.

### The July 11–12, 2026 incident (what happened, what it means going forward)

A real WSL2 virtual-disk I/O failure (ext4 corruption, forced read-only remount —
confirmed via `dmesg`) cascaded into Docker Desktop's WSL2 integration breaking
entirely (`execvpe(...docker-desktop-user-distro) failed: No such file or
directory`). Using Task Manager "End all tasks" on Docker Desktop mid-troubleshoot
made things *worse* — always use the tray icon's graceful "Quit Docker Desktop",
or `wsl --shutdown` from a real **Windows PowerShell window** (not from inside the
WSL/Linux bash prompt — `wsl` isn't a command there). A full computer restart
eventually restored basic Docker Desktop functionality.

**The lingering, less obvious symptom:** afterward, `radarr`, `sonarr`,
`prowlarr`, and `sabnzbd` all appeared to have fresh/empty data — Radarr's logs
showed FluentMigrator running a full migration burst plus
`QualityProfileService: Setting up default quality profiles` (the fresh-DB tell),
Sonarr/Radarr/Prowlarr showed "Authentication Required"/empty libraries, sabnzbd
showed "External internet access denied." **None of this was real data loss.**
The actual `radarr.db`/`sonarr.db` files on `D:\HomeServer\radarr\` etc. were
confirmed intact and full-size the entire time (via Windows Explorer, via a
`ls -la` directly on the WSL host path, and via the scheduled backup zips in each
app's own `Backups\scheduled\` folder — Radarr/Sonarr/Prowlarr all have their own
built-in scheduled backup feature, Settings → General → Backup, separate from
anything Cowork manages). What was actually happening: **`docker exec <container>
ls -la <path>` was reading a stale, wrong (tiny, freshly-initialized) view of the
bind-mounted file through Docker's mount bridge**, even though the real file on
disk was untouched. Neither a plain `docker restart <name>` nor a full computer
reboot fixed this — both just reuse/re-launch the existing container against the
same stale bridge. **The actual fix: `docker compose down` (full remove) followed
by `docker compose up -d` (full recreate)** for the affected stack, which forces
Docker to re-resolve every bind mount fresh. Confirmed working — file sizes
reported by `docker exec` matched the real host files immediately after.

**Workaround for the Cloudflare upload cap (added 2026-07-12):** Settings now
has a "Local / Tailscale Access URL" field (`shop_settings.local_access_url`,
`GET`/`PUT /api/shop-settings` in `backend/server.js`, `ShopSettings.local_access_url`
in `src/types.ts`). When set, `MediaField.tsx`'s Reformat panel shows a bright-blue
"Open Quick Uploader Locally" button whenever a selected video is over 100MB —
the point where it can start hitting Cloudflare's 100-200MB proxy cap — and hides
the hint entirely if you're already on that origin. The owner has Tailscale
running on the host (`100.88.5.11` as of this writing) and confirmed the LAN IP
`192.168.50.223:4000` also works, since `workshop-backend` maps port 4000
straight through in `docker-compose.yml`. Switching origins means logging back
in — `workshop_token` in `localStorage` is scoped per-origin and doesn't carry
over.

The link doesn't just point at the bare local URL — it appends
`?view=reformat-tool`, which `App.tsx` reads once at its initial `view` state to
land on `QuickReformatView.tsx` (a bare-bones upload/reformat tool + "Copy URL"
button) instead of the Dashboard. This works even when the user isn't already
logged in on that origin: `ProtectedRoute.tsx` shows `LoginPage` first, and
`LoginPage`'s `onSuccess` does a full `window.location.reload()` — which
preserves the query string, so `App.tsx`'s initial-state read fires again on
the reload and still lands on the tool. There's no cross-tab file/URL handoff
beyond that — the user manually copies the resulting URL back into whatever
field they were editing in the original (public-domain) tab. That's fine
because the local URL and public domain are the exact same backend and SQLite
database, just reached over a different network path — nothing needs to sync.

**Diagnostic pattern worth reusing:** if any container ever looks like it "lost"
its data again, compare three things before assuming real loss: (1) the file size
via `docker exec <container> ls -la <path>`, (2) the file size via `ls -la`
directly on the actual WSL host path (e.g. `/mnt/d/HomeServer/radarr/radarr.db`),
and (3) Windows Explorer's own view of the same file. If (2) and (3) agree but
(1) doesn't, it's a stale Docker mount bridge, not lost data — fix with
`docker compose down && docker compose up -d`, not a restart.

**Update, 2026-07-11 evening — this bug is NOT limited to crash recovery, and it hit
`ragnarok-backend` too.** A plain Windows restart (no crash, no WSL2 corruption —
just a normal reboot) triggered the same stale-bind-mount symptom on
`ragnarok-backend`: the Payments page (and by extension every other page, since all
of them read through the same `/data` bind mount) showed $0.00 / empty, even though
the real data in `data/db/workshop.db` was completely intact (verified: 4 customers,
3 jobs, 1 succeeded $567.93 payment from 2026-07-08, all correctly owned by the
logged-in user). Likely mechanism: `ragnarok-backend` has `restart: unless-stopped`
in `docker-compose.yml`, so on reboot Docker Desktop resumes the *existing* container
object rather than recreating it. If WSL2's DrvFs mount for `D:\` isn't fully
re-established by the time Docker Desktop resumes the container, the resumed
container can end up bound to a stale/incomplete view of `/data` — same root
mechanism as the radarr/sonarr incident, just triggered by an ordinary restart
instead of a crash. `docker compose down` alone can fail to fully remove it
(`Network ... Resource is still in use` + a leftover `ragnarok-backend` container
name conflict on the following `up`) — when that happens, force it with
`docker stop ragnarok-backend && docker rm ragnarok-backend`, then
`docker compose up -d workshop-backend`. This fixed it immediately.

**Practical implication: treat this as possible after ANY computer restart, not
just after a crash.** If Ragnarök's data ever looks empty/reset after rebooting the
machine — Payments, Dashboard, Customers, anything — try the recreate fix above
before assuming real data loss or an auth/user-scoping bug.

**Fixed at the source, 2026-07-12 — self-heal added directly to the webhook.**
Rather than a separate Windows Task Scheduler script, `/opt/workshop-webhook/webhook.js`
itself now force-recreates `ragnarok-backend` automatically, since that container
already runs with `restart: unless-stopped` (so it starts fresh on every reboot)
and already has docker.sock access. On every webhook-process startup it schedules
a `reconcileBackendMount()` call ~90s later — enough time for WSL2/Docker to settle
after boot — which does the same `docker stop`/`rm`/`run` sequence the deploy path
already uses (recreate from the existing tagged image, no rebuild, ~1-2s of
backend downtime). A `rebuildInProgress` flag skips the reconcile if a real deploy
happens to be running at that exact moment. Confirmed working via
`docker logs workshop-webhook`: `Scheduling startup mount reconcile in 90s...` →
`Startup mount reconcile complete - ragnarok-backend recreated`.

**Practical effect: this class of bug should now self-correct on every boot without
manual intervention.** If it ever recurs anyway, check `docker logs workshop-webhook`
first to see whether the reconcile actually ran and what it logged, before falling
back to the manual `docker stop ragnarok-backend && docker rm ragnarok-backend &&
docker compose up -d workshop-backend` fix.

**Note on file location:** `webhook.js` lives only at `/opt/workshop-webhook/webhook.js`
on the host — it is NOT part of the git-based protected-files restore mechanism (it's
not in the protected files list above, and isn't rebuilt from any Dockerfile; the
`webhook` service in `docker-compose.yml` bind-mounts `/opt/workshop-webhook` straight
into the container). Edits take effect on-disk immediately; only
`docker restart workshop-webhook` is needed to reload the running process — no git
push, no mirror-first dance. The copy that sits inside the images mirror repo
(`workshop-core/webhook.js`) is a stale, disconnected reference copy only — confirmed
stale again on 2026-07-12 (missing several `restoreCoreFiles()` entries and the
`--env-file`/timeout changes present in the live version). Always fetch the live file
via `cat /opt/workshop-webhook/webhook.js` before editing it, never trust the mirror
copy.

**A red herring from this incident, debunked:** a diff against an older copy of
`D:\HomeServer\docker-compose.yml` showed its volume paths had changed from
`D:\...` to `/mnt/d/...` at some point. This looked like a plausible root cause
but wasn't — see the path-syntax note above. Don't revisit this theory.

**Other fixes made to `D:\HomeServer\docker-compose.yml` during this incident**
(still in effect, don't undo):
- `seerr` service: added `user: "0:0"` — fixed an `EACCES: permission denied,
  mkdir '/app/config/logs/'` crash-loop.
- `sabnzbd.ini` had a genuine bug introduced and then fixed in this same
  session: a duplicate `host_whitelist` key (one added redundantly by Claude,
  one already present further down the file) — configobj doesn't tolerate
  duplicate keys in the same section. Removed the duplicate; the file now has
  exactly one `host_whitelist` line.

**Known, still-open issues as of 2026-07-11** (flagged, not yet fixed — ask the
owner before touching):
- Sonarr and Radarr both repeatedly log
  `Import failed, path does not exist or is not accessible by Sonarr/Radarr` for
  `/downloads/complete/...` paths — likely a PUID/PGID or path-mapping mismatch
  between qbittorrent/sabnzbd's view of `/downloads` and Sonarr/Radarr's view of
  the same mount.
- `wizarr` repeatedly logs `PermissionError: Operation not permitted` on its own
  session cache files under `/data/database/sessions/`.

**General prevention rules for this host going forward:**
- Never hard-kill Docker Desktop via Task Manager "End all tasks" — always quit
  gracefully or use `wsl --shutdown` from actual Windows PowerShell.
- Low free space on the C: drive (where WSL2's own virtual disks live) is the
  most likely cause of a repeat ext4/DrvFs corruption event — worth checking
  periodically.
- Keep Docker Desktop itself updated — this class of WSL2 file-sharing bridge
  bug gets patched over time.
- The Cowork nightly DB backup scheduled task is scoped **only** to this repo's
  own `data/`/`workshop.db` — it has no relationship to the homelab stack above
  and can't affect or be affected by anything in this section.

## Standing workflow rules

- **Any command the owner is meant to run themselves (terminal, PowerShell, etc.)
  must always be given in a copyable code block** — never as inline text. This
  applies to every command, no matter how short.
- Any edit to a protected-list file must be made in BOTH `Workshop-Ragnarok` and the
  `images` mirror repo — mirror pushed first, always.
- Verify Docker fixes with `--no-cache --progress=plain`, never a normal cached
  build, when confirming whether something is actually fixed.
- If a file looks corrupted identically across multiple fetch methods, suspect the
  committed source before suspecting the network.
- If a container on the shared host ever looks like it lost its data after a
  crash or forced restart, see "Host environment" above before assuming real
  loss — `docker compose down && docker compose up -d` is very likely the fix,
  not a restart.
