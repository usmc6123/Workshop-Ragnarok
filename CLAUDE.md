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

## Standing workflow rules

- Any edit to a protected-list file must be made in BOTH `Workshop-Ragnarok` and the
  `images` mirror repo — mirror pushed first, always.
- Verify Docker fixes with `--no-cache --progress=plain`, never a normal cached
  build, when confirming whether something is actually fixed.
- If a file looks corrupted identically across multiple fetch methods, suspect the
  committed source before suspecting the network.
