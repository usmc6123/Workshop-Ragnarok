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

**Sites layers panel (added 2026-07-12, reworked same day).** `src/components/SiteLayersPanel.tsx`
— a left-side column in `SiteBuilderView.tsx`'s block editor (`tab ===
'blocks'`), lists every block on the page frontmost-first. There's no
dedicated z-index field on `SiteBlock` — stacking order has always just been
array/DOM order (the `position` column). The original version added plain
bring-to-front/forward/backward/send-to-back buttons (`handleReorderBlock()`
+ the already-existing-but-previously-unused `PUT /api/sites/:id/blocks/reorder`
backend route / `api.reorderSiteBlocks()`), but this had a real bug: `SiteGridCanvas.tsx`
gave whichever block was *currently selected* a `z-20` bump on top of a flat
`z-10` for everything else, so selecting a different (e.g. background) block
could visually re-bury a block the user had deliberately brought to front —
reported as "when i click on another image..it wont push the video behind it
again."

**Fix: per-block lock.** `BlockStyle` (the JSON blob in `SiteBlock.style`)
gained two new optional keys, no DB migration needed: `z_lock?: 'front' |
'back'` and `custom_label?: string`. `SiteGridCanvas.tsx` now computes
z-index as `z_lock==='front' ? z-30 : z_lock==='back' ? z-0 : isSelected ?
z-20 : z-10` — a lock now always outranks the selection bump, which is the
actual fix. `SiteLayersPanel.tsx` was redesigned around this: the old 4
arrow buttons (reported as "confusing") are gone, replaced by exactly 2
per-row toggle buttons, "Lock to Front" / "Lock to Back" — clicking one both
moves the block there (via `handleToggleLock()` in `SiteBuilderView.tsx`,
which reorders the array via the same `reorderSiteBlocks()` endpoint AND
patches `style.z_lock`) and pins it there regardless of what else gets
selected afterward. The plain one-shot (non-locking) bring-to-front/send-to-
back actions weren't dropped — they moved to the canvas's right-click
context menu instead (`handleReorderBlock()` is still there, just no longer
wired to the layers panel). The layers list is now also displayed in the
exact order things actually render (locked-front blocks, then normal blocks,
then locked-back blocks, each group most-front-first) instead of raw array
order, so "position in the list" always matches "position in the stack."
Clicking a row now also opens that block's inspector on the right
(previously it only selected the block on canvas, leaving the inspector
showing whatever was last opened — a real mismatch bug). Each layer can also
be renamed inline (pencil icon → text input → Enter/blur saves via
`handleRenameBlock()`), storing the custom name in `style.custom_label`,
shown in the layers list and the canvas's floating toolbar in place of the
generic block-type label.

**Two real bugs found and fixed in the block inspector (2026-07-12), reported
as "my image goes away, I have to re-upload" and "the preview changes size
dramatically and doesn't match the live site."**

1. `scheduleInspectorSave()` in `SiteBuilderView.tsx` used ONE shared
   `inspectorSaveTimer` ref for every block's debounced autosave (500ms).
   Uploading an image schedules a save; if the user clicked to select a
   *different* block before that 500ms elapsed (very easy to do — e.g.
   clicking a different layer right after an upload), the new block's call to
   `scheduleInspectorSave()` called `clearTimeout()` on the SAME shared timer,
   silently cancelling and permanently losing the first block's pending save.
   The image URL had already been applied to local state (so it looked fine
   for a moment) but was never persisted — a later block reload then showed
   it as gone. Fixed by keying the timers per-block:
   `inspectorSaveTimers = useRef<Record<number, Timeout>>({})`, so saves for
   different blocks can never cancel each other.

2. `SiteGridCanvas.tsx` measured its own container's actual width and used
   that for column math, while row height stayed a hardcoded constant
   (`ROW_UNIT_PX`) regardless. Opening the ~420px inspector panel shrinks the
   canvas's container — so column widths shrank but row heights didn't,
   visibly distorting every block's aspect ratio, and the "Page width preview
   — matches the live site's max width" label became false the moment the
   panel was narrower than that claimed width. Fixed by making the canvas
   always render its actual content at the device's true design width
   (1152/768/375px — same numbers `SitePageView.tsx` effectively targets),
   then visually scaling the whole thing down as one rigid unit
   (`transform: scale()`) to fit whatever space is actually available.
   Proportions can now never distort — opening the inspector just zooms the
   same accurate preview out, and the size label now says e.g. "1152px
   (zoomed to 61% to fit)" so it's honest about what's happening. Drag/resize
   math (`handlePointerMove`) had to be adjusted to divide screen-pixel mouse
   deltas by the current `scale` before converting to grid columns/rows,
   since a screen pixel of mouse movement now corresponds to more than one
   canvas-space pixel whenever zoomed out.

Also: clicking a block directly on the canvas now also switches the
inspector to that block IF the inspector is already open for a different one
(`handleCanvasSelect()` in `SiteBuilderView.tsx`) — previously only the
Layers panel did this; a plain canvas click only changed the selection
outline and left the inspector showing stale content for whatever block was
last opened.

**The real, deeper cause of "my image goes away" (found 2026-07-12, after the
debounce-timer fix above turned out to be a real but secondary bug).** A live
site ("Cooper") went completely blank — solid black, no content at all.
Diagnosed via the browser's Network tab (not guessing): `GET
/api/public-sites/by-subdomain/cooper` returned `200 OK` with real block rows,
but both blocks' `content` was literally `"{}"` — empty. `style` (grid
position, `z_lock`) was intact. `ImageView`/`VideoView` in
`SiteBlockRenderers.tsx` both `return null` when there's no image/video URL
and `editable` is false — so an empty `content` on every block renders as
nothing at all, leaving just the page's own dark background. That's the whole
bug: not a rare race, a block that's been locked or dragged loses its content
outright.

Root cause: `PUT /api/sites/:id/blocks/:blockId` in `backend/server.js` did
`UPDATE site_blocks SET content = ?, media_opacity = ?, style = ?` on every
call, defaulting ANY omitted field to `{}` (`JSON.stringify(content || {})`).
It was never a true partial-update endpoint despite the frontend TS type
(`data: { content?; media_opacity?; style? }`) implying one. Several frontend
callers legitimately only ever send `{ style }` — `handlePositionChange()`
(fires on every drag/resize) and the Layers panel's `handleToggleLock()` /
`handleRenameBlock()` added earlier this same day — and every one of those
calls was silently wiping that block's real content to empty. This is why it
looked intermittent: it only became visible once someone reloaded/previewed
the site, by which point normal editing had already moved on.

Fixed by making the route a genuine partial update: it now reads the existing
row first and only overwrites a column if the caller's request body actually
contained that key (`'content' in req.body`, not just a falsy check), keeping
the existing DB value otherwise.

**This bug means any site block that was ever dragged, resized, locked, or
renamed without also having its content freshly saved in the same request may
have had its content wiped at some point before this fix landed — worth
spot-checking older Sites pages, not just Cooper, after this deploys.**

**"Zoom & Position" — per-media crop/pan tool (added 2026-07-12).** Right-click
any image or video on a Sites builder canvas and (if the click landed on an
actual image/video, not empty block padding) a "Zoom & Position" option
appears in the context menu. Picking it drops the canvas into an interactive
mode for THAT specific media element: scroll to zoom (100%-400%), click-and-
drag to pan, a small floating toolbar (zoom %, +/-, reset, done) follows it.
Works on every media field app-wide, including each photo individually inside
a multi-image Image Gallery block.

Data model: a new `media_transform` JSON column on `site_blocks` (added via
the same migration-array pattern as `style`), map-keyed exactly like
`media_opacity` (`image_url`, `video_url`, `photo_url`, `gallery_0`,
`gallery_1`, ...) — `{ zoom: number, x: number, y: number }` per key, applied
as `transform: translate(x%, y%) scale(zoom)`. Rendering helpers
`getMediaTransform()`/`mediaTransformStyle()` live in `SiteBlockRenderers.tsx`
right next to the existing `getOpacity()`, and every media element (Hero
image/video, Video block, Testimonial photo, Gallery images in both grid and
carousel layout) got a `data-media-key` attribute stamped on it — that
attribute is how the canvas figures out WHICH media field a right-click
landed on without needing to know each block type's internal layout. Hero's
image background was refactored from a CSS `background-image` div to a real
`<img>` in the process, purely so it could share the exact same transform
mechanism as everything else instead of needing its own
`backgroundSize`/`backgroundPosition` math.

Canvas interaction (`SiteGridCanvas.tsx`'s new `TransformOverlay`): right-
click walks up from `e.target` looking for the nearest `data-media-key`
ancestor (`findMediaKey()`), sets `transformEditTarget` in
`SiteBuilderView.tsx`. While active, a transparent overlay is positioned
via `getBoundingClientRect()` math to sit exactly on top of that one media
element (as percentages of the block's own box, so it stays correct
regardless of the canvas's own zoom-to-fit scale from the "distortion" fix
above) — the block's normal move/resize handles are hidden while this overlay
is showing, swapped back in once you hit Done. Drag-to-pan divides the
screen-pixel delta by the CURRENT zoom level before converting to a percent
offset, since `translate(x%, y%) scale(zoom)` applies scale AFTER translate
and would otherwise make dragging feel like it accelerates the more zoomed
in you already are. Pan is clamped to `50 * (1 - 1/zoom)` in each direction
so you can't drag the image so far the box shows empty space past its edge.

Persistence reuses the exact per-key debounced-save pattern established for
the inspector fields earlier the same day (`handleTransformChange()` in
`SiteBuilderView.tsx`), and the backend's now-genuinely-partial `PUT
/api/sites/:id/blocks/:blockId` (see the bug entry above) was extended to
recognize `media_transform` as a fourth independently-patchable field —
important, since without that this feature would have hit the exact same
"send just the field you changed, silently wipe everything else" bug that had
just been fixed for content/style.
Hero/Video/Testimonial blocks all had a `showOpacity` slider on their
`MediaField` already; the Image Gallery block's per-image `MediaField` in
`SiteBuilderView.tsx`'s `BlockContentEditor` never got the same `opacityKey`/
`mediaOpacity`/`onOpacityChange`/`showOpacity` props. Fixed by wiring those
in, keyed per-image as `gallery_${idx}` in the existing `media_opacity` JSON
map, and applying it in `SiteBlockRenderers.tsx`'s `ImageView` (both the grid
and carousel layouts — for carousel, multiplied into the existing crossfade
opacity rather than replacing it).

**"Formatted Media" library (added 2026-07-12).** A web page can't open a
native OS file browser — that's a real browser security restriction, not
something fixable from app code — so this is the actual substitute: a
`FolderOpen` button on `FunnelsView.tsx` (next to Generate Video) opens
`MediaLibraryModal.tsx`, which lists every file in `UPLOADS_ROOT/media/`
(everything ever written by either `POST /api/uploads` or the Reformat tool)
with a thumbnail, size, date, a "Copy URL" button, and delete. Backend:
`GET /api/uploads/media` (lists the directory via `fs.readdirSync`) and
`DELETE /api/uploads/media/:filename` (deletes one, `path.basename()`d to
prevent directory traversal) in `backend/server.js`. Works from any device,
not just the machine the files physically live on. The modal renders via
`createPortal(..., document.body)`, not a plain `fixed` div — `App.tsx`'s
page-zoom feature applies a CSS `transform: scale()` to the page wrapper,
which creates a new containing block and breaks naive `position: fixed`
full-screen modals if they're not portalled straight to `document.body`
(the existing modals in `FunnelsView.tsx` already do this for the same
reason — matched that pattern here). No warning is given if a file being
deleted is still referenced by a live Site or Funnel — deleting one just
breaks that image/video slot, no different from deleting any other asset.

**Export features added 2026-07-12: Sites HTML/PDF export, Customers/Inventory
CSV export.** All three deliberately avoid new dependencies (no jsPDF/html2canvas,
no CSV library) — `src/lib/csv.ts` is a ~20-line hand-rolled CSV writer
(`downloadCSV(filename, columns, rows)`, handles quoting/escaping + a UTF-8 BOM
so Excel doesn't mangle accented characters), wired into "Export CSV" buttons on
`CustomersView.tsx` (exports `filteredCustomers`, respecting the search box) and
`InventoryView.tsx` (exports `items`, which is already server-filtered by the
current search/category selection — so both exports always match what's on
screen, not the full unfiltered table).

Sites HTML/PDF export (`handleExportHTML`/`handleExportPDF` in
`SiteBuilderView.tsx`, next to the existing JSON Export/Import buttons) both
deliberately reuse the REAL live public page at `/site/:subdomain`
(`SitePageView.tsx`) instead of re-implementing block rendering — this
guarantees the export always looks exactly like what a visitor sees, at the
cost of reflecting the last-saved state rather than any unsaved keystroke
(autosave is ~300-500ms, so in practice this is a non-issue).
- **HTML export**: loads the live page in an off-screen hidden iframe, polls
  for `.site-grid` (or the empty-state text) to confirm React has actually
  rendered before capturing anything, then fetches and inlines every
  `<link rel="stylesheet">` bundle as a single `<style>` tag, strips
  `<script>`/`modulepreload` tags (a static snapshot needs no JS), prepends a
  `<base href>` pointing back at this server, and downloads the result as
  `<subdomain>-site-snapshot.html`. **Known limitation, accepted by design**:
  media (image/video) URLs are left pointing at this server rather than
  base64-embedded — the exported file is a real, portable HTML document, but
  this server needs to stay reachable for its images/video to actually load.
- **PDF export**: opens the live page in a real new tab/window and calls
  `window.print()` once it's confirmed rendered (same `.site-grid` poll,
  cross-origin-during-load exceptions from checking `win.document` early are
  expected and just retried) — deliberately NOT a JS PDF library
  (jsPDF/html2canvas), since those have real, well-known fidelity problems
  with CSS Grid layouts, `<video>` elements, and custom web fonts; letting the
  browser's own native print pipeline handle it sidesteps all of that.
  `SitePageView.tsx` also gained an always-on `@media print` block
  (`PRINT_CSS`) forcing a white background and `break-inside: avoid` on each
  block — without it, a dark-themed site would print as a solid black,
  unreadable, ink-wasting page.

**Undo/redo overhaul + Layers panel drag-reordering (added 2026-07-12).**
Reported as two issues: "make sure undo/redo only go back one edit at a time"
and "I want a history I can jump back through instead of clicking one-by-one,
plus a better way to organize many overlapping layers."

*Root cause of the granularity bug*: several real edit paths never called
`pushHistory()` at all — the right-side Inspector's content/opacity/style
fields (`handleDraftContentChange`/`handleDraftOpacityChange`/
`handleDraftStyleChange`), the Layers panel rename action, and the "Zoom &
Position" drag/scroll transform. Since only some edits were recorded, a
single Undo click could silently skip over — or permanently strand — edits
made through those paths, which is what made undo feel like it was jumping
more than one step. Fixed by pushing exactly one history entry per logical
edit everywhere: a plain single `pushHistory(label)` call for one-shot
actions (add/duplicate/delete/reorder/lock/rename), and the same
debounce-once-per-burst pattern already used for inline canvas text editing
(`contentHistoryPushed`) extended to the Inspector fields
(`inspectorHistoryPushed`, keyed per block) and the zoom/pan transform
(`transformHistoryPushed`, keyed per `blockId:mediaKey`) — the history push
fires on the FIRST change of a burst and the "pushed" flag only resets once
that burst's debounced save actually completes, so a flurry of keystrokes,
opacity-slider drags, or scroll-to-zoom ticks all collapse into one undo
step. `restoreSnapshot()` was also fixed to diff/restore `media_transform`
too — it was being silently ignored before, so undoing a zoom/pan change
wouldn't actually revert it even once it started being tracked.

*History dropdown*: `history`/`future` (in `SiteBuilderView.tsx`) changed
from plain `SiteBlock[][]` snapshots to `{ label, blocks }[]` — every
`pushHistory()` call site now passes a human-readable label (e.g. "Moved
Video block", "Locked to front: Image Gallery block"). Right-clicking Undo
or Redo opens a dropdown (`historyMenu` state) listing entries nearest-first,
and clicking one jumps straight there via `jumpBackTo(index)` /
`jumpForwardTo(index)` — generalized versions of plain Undo/Redo (which are
now just `jumpBackTo(history.length-1)` / `jumpForwardTo(future.length-1)`).
The tricky part was re-labeling entries correctly when skipping multiple
steps at once: each stored label describes the edit that *produced* the
entry's paired blocks in the array it's moving TO, not the array it came
from — `relabelChain()` walks the skipped entries back-to-front to re-pair
each label with the right resulting state before handing them to the other
stack. Worked out on paper against concrete 3-4-state traces before writing
the code, specifically to avoid an off-by-one in which label ends up next to
which snapshot.

*Layers panel reorganization*: with several overlapping blocks, the
front/back lock buttons alone weren't precise enough — no way to set
relative order among multiple blocks that are all locked front (or all
normal, or all locked back). `SiteLayersPanel.tsx` gained real drag-and-drop
reordering (grip handle icon, HTML5 drag events, dashed drop-target
outline), restricted to reordering WITHIN the same lock group only (dragging
a normal-group row onto a locked-front row is a no-op — use the lock buttons
to move between groups, dragging to set order within one). Section headers
("Locked to Front" / "Unlocked" / "Locked to Back") now appear automatically
once 2+ of the three groups are non-empty, so the list stays readable as
layer count grows instead of turning into one undifferentiated stack — a
single-group page looks exactly as simple as before. The drop handler
(`handleDrop` in `SiteLayersPanel.tsx`) works entirely in display-order
(front-first) space then converts back to the array's actual storage order
(back-to-front, per-group) before calling the new `onReorder` prop, wired to
`handleDragReorderBlocks` in `SiteBuilderView.tsx` — same single-call
persist-then-reconcile pattern as every other block mutation, and correctly
pushes one `'Reordered layers'` undo step per drop.

**Custom Sites card thumbnail (added 2026-07-12).** The Sites list previously
always showed a live mini-render of the page's current blocks
(`SiteThumbnail.tsx`) as each card's preview, with no way to override it.
Added a `thumbnail_url TEXT` column on `sites` (migration in `server.js`,
same pattern as `favicon_url`), plumbed through `POST`/`PUT /api/sites` and
the `Site` type. `SitesView.tsx`'s Settings modal gained a "Card Thumbnail"
`MediaField` (same upload/paste-URL/reformat component used everywhere else
in the app — shop logo, block images, etc.), placed right under the
Dark/Light theme toggle. The card grid now shows `site.thumbnail_url` as a
plain `object-cover` image when set, matching `SiteThumbnail`'s exact
size/rounding/border so the two don't look inconsistent side by side;
leaving it blank keeps the existing live block-render behavior — this is a
pure additive override, not a replacement of the old thumbnail system.
Public-facing site data (`PublicSite` type, the public `by-subdomain` route)
deliberately does NOT expose `thumbnail_url` — it's Sites-list-only, visitors
never see it.

**Funnels custom card thumbnail (added 2026-07-12, same pattern as Sites'
thumbnail_url above).** `funnels` gained a `thumbnail_url TEXT` column
(migration in `server.js`, right after `media_opacity`), plumbed through
`POST`/`PUT /api/funnels` and the `Funnel` type. `FunnelsView.tsx`'s
Create/Edit modal gained a "Card Thumbnail" `MediaField` section (same
upload component, `maxImageDimension={800}`, right after Basic Info, before
Page Layout). The funnels list card's thumbnail preview now checks
`thumbnail_url` FIRST, before falling back to the existing chain
(`image_url` → `video_url` → `hero_video_url` → "No preview media"
placeholder) — so funnels that never set an explicit thumbnail keep
behaving exactly as before.

**Sites builder toolbar: consolidated export buttons (added 2026-07-12).**
The three separate "Export" / "Export HTML" / "Export PDF" buttons in
`SiteBuilderView.tsx` were replaced with a single "Export" button that opens
a dropdown (`exportMenuOpen` state) listing all three formats with a short
description each, styled like the existing context-menu/history-dropdown
pattern (`bg-[#1a1c24]/98 backdrop-blur-xl`). "Import" stays a separate
toolbar button since it's not an export format. Closing behavior reuses the
same outside-click effect that already closes the block context menu and
the undo/redo history dropdown.

**"Sites" relabeled to "Website Builder" / "Websites" (2026-07-12).** Purely
cosmetic — the internal `view` routing id (`'sites'`), URL paths
(`/site/:subdomain`), API routes (`/api/sites`), and DB table names are all
UNCHANGED (renaming those would have been a much bigger, riskier change for
zero user-facing benefit). Only visible label text changed: `Sidebar.tsx`'s
nav item label ("Sites" → "Websites"), `SitesView.tsx`'s own page `<h1>`
("Sites" → "Website Builder"), and in `App.tsx`'s top header bar both
`getViewTitle()` (gained an explicit `case 'sites'`, previously fell through
to the generic "Workshop Management" default) and the breadcrumb line below
it (special-cased `view === 'sites'` to show "website builder" instead of
the raw `sites` view id, same pattern already used for `manual-library` →
"manuals").

**Three pre-existing TypeScript errors fixed (2026-07-12), found via `npm run
lint` after a deploy-readiness check — none were introduced by same-day work,
confirmed by checking each against exactly what had been touched:**
1. `FunnelsView.tsx`'s `handleToggleActive` sent a boolean where `Partial<Funnel>.active`
   expects `0 | 1`. Worked fine at runtime (backend does `active === false ? 0 : 1`,
   so a real boolean already coerced correctly) but was a genuine type-checker complaint.
   Fixed: `active: funnel.active ? 0 : 1`, matching the pattern `SitesView.tsx` already used.
2. `SiteBuilderView.tsx`'s `PresetToggle<T extends string>` rejected
   `BORDER_WIDTH_OPTIONS` (numeric `0|1|2|4` values) — the only one of its 19
   call sites using non-string values. `PresetToggle`'s internals only ever
   do `===` comparisons and pass the raw value through, no string-specific
   logic — so widening the constraint to `T extends string | number` fixed
   it with zero effect on the other 18 (string-based) call sites.
3. `TextsView.tsx`'s `TRIGGER_META` map was missing entries for 4 of the 9
   `SmsTriggerType` values (`stale_lead_followup`, `unpaid_reminder`,
   `winback`, `review_request`) — these automations (in `backend/server.js`:
   stale funnel-lead nudge, unpaid-invoice reminder, service-due win-back,
   post-completion review request) have been firing real SMS with these
   trigger types for a while; the UI's icon/label/color lookup just never
   had matching entries. Added all 4, purely additive (existing entries
   untouched).

**Sites URL structure flattened to one-level subdomains (2026-07-12) — real
architecture change, not cosmetic.** Originally sites lived at
`<subdomain>.sites.homeslab.uk` (two levels below the zone). Setting up the
one-time wildcard Cloudflare Tunnel route for that hit "Invalid subdomain
format" in the dashboard's Add Published Application form — turned out to be
two compounding things, confirmed via web research, not guessing: (1) a
genuine Cloudflare dashboard bug that rejects wildcard subdomain entries in
that specific form even though the underlying tunnel/API fully supports
them, and (2) more fundamentally, a *multi-level* wildcard (a wildcard plus
an extra label before the zone, like `*.sites.homeslab.uk`) needs Cloudflare
Total TLS to get a valid certificate, and on this account Total TLS itself
is gated behind Advanced Certificate Manager — a **$10/month paid add-on**.
Owner chose NOT to pay for that (confirmed explicitly, weighed against the
one-time code cost below) and instead flatten the URL scheme to
`<subdomain>.homeslab.uk` (one level), which IS covered by the zone's
existing free Universal SSL wildcard cert (`*.homeslab.uk`) — same wildcard
tunnel-route mechanism, zero ongoing cost, zero future per-site setup, just
one label shorter.

**The real tradeoff of flattening, and how it's handled:** with sites now
sharing the exact same one-level namespace as the main app's own hostname
(`workshop.homeslab.uk`), there's no longer a structural way (like the old
literal `.sites.` marker) to tell "this is a site" apart from "this is the
dashboard" purely from the hostname shape — a site could theoretically be
named `workshop` and collide. Solved with a reserved-word list rather than
a schema change: `src/constants/sites.ts` exports `SITES_BASE_DOMAIN`
(`'homeslab.uk'`) and `RESERVED_SITE_SUBDOMAINS` (currently just `workshop`
and `www`), imported by both `App.tsx` (hostname-detection routing — a
request to `<label>.homeslab.uk` only renders `SitePageView` if `<label>`
isn't reserved) and `SitesView.tsx` (rejects the reserved words in the
create/edit form). `backend/server.js` has its own copy of the same set
(`RESERVED_SITE_SUBDOMAINS` near `cleanSubdomain()`) enforced in both
`POST`/`PUT /api/sites`, since a direct API call could otherwise bypass the
frontend form check — **keep both lists in sync if this ever changes, and
add to both any time another single-level hostname gets pointed at the
`ragnarok-backend` container** (the failure mode if forgotten: a visitor to
that new hostname would incorrectly see "site not found" instead of the
real page, since it'd get treated as an unmatched site subdomain lookup).
All hardcoded `.sites.homeslab.uk` references were swept and updated:
`SiteBuilderView.tsx`'s header subtitle, `SitesView.tsx`'s live-URL builder/
subdomain input suffix/help card, and `backend/site-routes.js`'s comments.

**Layers panel lock buttons: kept the word "Front"/"Back" always visible
instead of swapping to "Locked" (2026-07-12).** Originally `LockButton` in
`SiteLayersPanel.tsx` displayed "Locked" in place of "Front"/"Back" once
active — reported as confusing since the label changes out from under you.
Fixed to always show "Front"/"Back", with lock state conveyed instead by
the existing amber highlight plus a small `Lock` icon appended next to
whichever one is currently active.

**Site Theme tab redesigned with a visual preset gallery (2026-07-12).**
Reported as "ugly as hell" with no way to tell what a color/font combo
actually looks like before saving. New file `src/constants/sitePresets.ts`
exports `SITE_THEME_PRESETS` — 12 curated `{ accent_color, secondary_color,
heading_font, body_font }` bundles (Amber Workshop, Ocean Blue, Crimson
Racer, Emerald Garage, Violet Neon, Sunset Orange, Racing Yellow, Classic
Editorial, Slate Minimal, Pastel Soft, Forest Trail, Midnight Steel), each
font value pulled from the existing `SITE_FONT_OPTIONS` list so nothing new
needs loading. `SiteBuilderView.tsx`'s `tab === 'theme'` view is now two
stacked cards instead of one cramped `max-w-lg` form: a "Theme Presets" grid
(`ThemePresetCard`, new local component) where every thumbnail is a real
live-rendered mockup — a mini mock hero (shop name in the preset's heading
font/accent color, a body line in its body font, a pill button in its
accent color) actually styled with that preset's exact values, not a static
image or screenshot, so it can never go stale — followed by a "Customize"
card with the original manual color/font pickers plus a new large live
preview strip on top of them showing the current (possibly hand-edited)
combination the same way. Clicking a preset (`handleApplyPreset`) only
updates the in-memory `themeForm` — still requires the existing Save Theme
button to persist, so trying one is always a no-commitment preview.
`activePresetId` (exact-match compare against all 4 fields) puts a
checkmark on whichever preset currently matches the form, and correctly
un-highlights the moment any field is hand-edited away from it. Preview
backgrounds use the site's own current dark/light mode (`site.theme`,
edited separately in `SitesView.tsx`'s Settings modal) so what's shown
always matches what applying the preset would really look like on this
specific site — presets themselves don't touch dark/light.

**Layers panel: stopped lock toggle from silently reordering, added per-layer
delete (2026-07-12).** Reported as "don't move the layers once we lock or
unlock them, I'll arrange them however I want and it will stay there," plus a
request to delete a layer directly from the panel (with a confirmation) and
confirmation that drag-to-reorder should really work. Root cause of the
reorder complaint: `handleToggleLock` in `SiteBuilderView.tsx` didn't just
flip `style.z_lock`, it also spliced the block to the literal front (`push`)
or back (`unshift`) of the entire blocks array every time a lock was turned
on — so locking a layer after manually dragging it to a specific spot in the
Layers panel would immediately throw that arrangement away. Fixed by making
lock toggle a pure style flip with no array mutation at all; the block now
stays exactly where it was, and the Layers panel's front/normal/back grouping
just re-reads from whatever `z_lock` is currently set — manual drag order
(already implemented, see the drag-reordering entry above) is now the only
thing that ever moves a layer, unless you use the canvas's right-click Bring
to Front/Send to Back one-shot actions. Delete: `SiteLayersPanel.tsx` gained
a per-row trash-icon button (next to the two lock buttons) wired to the
existing `handleDeleteBlock`, which already gates on `confirm()` — reused
as-is rather than building a second delete path, just made the confirm
message name the specific layer (`Delete "X"? This can't be undone.`) since
the Layers panel context doesn't have the canvas visible to double check
against.

**Sites template library doubled + thumbnails now show real example content
(2026-07-12).** Reported as wanting "several more templates that are very
well thought out and useful," with actual example data visible in the
thumbnail so picking one isn't a guess. Added 6 new entries to
`src/constants/siteTemplates.ts` alongside the original 6 (Portfolio, Local
Service Business, Product/App Landing Page, Personal/About Me,
Restaurant/Menu, Coming Soon): Auto Repair Shop, Real Estate Listing,
Fitness/Gym, Photography Studio, Nonprofit/Fundraiser, and Event/Wedding —
each a full, realistic multi-block layout (hero, text, testimonial, pricing,
FAQ, image gallery, contact form in varying multi-column arrangements) with
example copy specific to that business type, not generic Lorem-ipsum-style
placeholders. `TemplateThumbnail.tsx` was rewritten: previously each block in
the mini schematic just showed a centered generic type icon (a grid icon, a
tag icon, etc.) regardless of what the template actually contained — now a
new `ThumbBlockContent` renders each block's REAL template content at a tiny
scale (hero/cta show the actual headline + button text, text blocks show
headline + a body excerpt, pricing shows the actual tier names/prices as
mini columns, testimonials show the actual quote + author, FAQ shows the
actual question list, contact forms show a headline + fake input-line
placeholders + the actual button text, image blocks show a small row of
placeholder tiles). This makes the thumbnail an actual preview of what
applying the template produces, not just an abstract wireframe. The template
picker grid in `SiteBuilderView.tsx` (`tab === 'blocks'`, `showTemplatePicker`
section) was also tightened to fit the now-12-template library: grid columns
went from a max of 3 to a max of 4 (`sm:grid-cols-3 xl:grid-cols-4`), card
padding/gaps and thumbnail aspect ratio were trimmed slightly (16/11 →
16/10), and the grid gained `max-h-[560px] overflow-y-auto` so a full
12-template library doesn't push the rest of the builder down excessively.

**Layers panel: rows vanishing whenever fewer than 2 lock groups had blocks
(2026-07-12) — the real cause of "my layers keep disappearing."** Reported
as layers disappearing after adding a third image, not coming back on
refresh, but reappearing after adding another block — which ruled out real
data loss (a refresh re-fetches from the DB; if the block still exists
server-side, this had to be a pure rendering bug) and pointed straight at
`SiteLayersPanel.tsx`. Root cause: `showSections` (`front/normal/back` counts,
true only when 2+ of the 3 groups are non-empty) was meant to control ONLY
whether the small section-header labels show, but it was also wrapping the
front and back groups' actual row rendering (`{showSections && front.length
> 0 && (...)}`). The `normal` group's rows rendered unconditionally with no
such gate. So any time fewer than 2 groups had anything in them — e.g. every
block locked to back and nothing left unlocked, a completely ordinary setup
(a background image locked back, a CTA locked front, nothing "normal") —
`showSections` went false and the one populated group's rows disappeared
outright, even though the blocks were still there in the database the whole
time. Adding a new block defaults to unlocked (`normal`), which bumped the
non-empty-group count back to 2+, flipped `showSections` back to true, and
made everything reappear at once — exactly matching "disappears, refresh
doesn't fix it, adding a block brings it back." Fixed by decoupling the two
concerns: each group's rows now render whenever that group is non-empty,
full stop; `showSections` only gates whether the little label above them is
shown.

**Layers panel drag-to-reorder rewritten on pointer events instead of native
HTML5 Drag and Drop (2026-07-12).** Reported as "hard, doesn't always work,"
especially reordering between two rows in the same lock group. Root cause:
the original implementation used real `draggable`/`onDragStart`/`onDragOver`/
`onDrop` — HTML5 DnD requires calling `preventDefault()` on every single
`dragover` tick just to keep accepting a drop (easy to miss a frame and have
the browser silently reject it), and structurally, dropping ON a row could
only ever insert the dragged item BEFORE that row — there was no drop target
that meant "after," so a layer could never be dragged to become the new last
item in its group without a workaround. Rewrote `SiteLayersPanel.tsx` to
track drags with pointer events instead: `onPointerDown` on the grip handle
calls `setPointerCapture()` so subsequent `pointermove`/`pointerup` keep
firing on that same element regardless of where the cursor physically is,
removing the whole preventDefault-every-tick fragility. While dragging, the
drop position is recomputed continuously by comparing the pointer's Y
position against every other row's vertical midpoint within the same lock
group (`handleDragMove`), and a live amber insertion-line (`DropIndicator`)
renders in the actual gap where the item will land — including a gap after
the last row, which fixes the "can't drop after" problem. `endDrag` converts
that display-order insertion back to storage order using the same
back/normal/front-segment-reversal math the old drop handler used. Dragging
is still restricted to within the same lock group (front/normal/back) —
unchanged from before, use the lock buttons to move a layer between groups.

**Editor/live-preview mismatch — the real cause of "templates don't stay
where I left them" (2026-07-12).** Reported two ways that turned out to be
the same bug: blocks (esp. from templates) looked repositioned after leaving
and returning to the builder, and — confirmed via a direct screenshot
comparison — a front-locked Pricing card sat right at the bottom edge of a
back-locked hero image in the editor, but rendered far below it with a large
gap on the live site (`workshop.homeslab.uk/site/roscoe`). Root cause found
by reading `SitePageView.tsx`'s grid container style: it used a real CSS
Grid (`display: grid`, `gridAutoRows: minmax(20px, auto)`) with
`columnGap: 20, rowGap: 20` — but the builder canvas (`SiteGridCanvas.tsx`)
positions every block with plain absolute pixel math (`top: row *
ROW_UNIT_PX`, no gutter at all), and every template's `grid_row` values were
authored assuming adjacent blocks sit flush against each other (one ending
at row 20, the next starting at row 20). CSS Grid's `row-gap` doesn't just
add one visible gap between blocks — it inserts a gap between EVERY implicit
row track, including the ones INSIDE a single block's own multi-row span. So
a 20-row-tall hero rendered ~380px taller live than in the editor (19
internal gaps × 20px), and any intentionally-overlapping locked blocks (a
front-locked card meant to sit over a back-locked background image — exactly
what today's whole z-lock feature was built for) ended up pushed far apart
instead of overlapping. This compounds across a whole page, so the more rows
a site used, the worse editor and live view diverged — matching "some
templates" being affected more visibly than others. `SiteThumbnail.tsx` (the
Sites-list card mini preview, which reuses the same CSS Grid approach) had
the exact same `columnGap: 20, rowGap: 20` and the same bug. Fixed by zeroing
both gaps in both files so they match the editor's zero-gap model exactly;
breathing room between blocks now comes from a Spacer block or a block's own
internal padding, same as the editor already assumed. HTML/PDF export were
never affected since both capture the live page verbatim (they inherit this
fix automatically, no separate change needed).

**Sites SEO tier added (2026-07-12).** Owner pasted a long SEO/website-builder
feature wishlist and asked for "the genuinely valuable tier" — deliberately
scoped down from the full list (skipped CDN/code-splitting/critical-CSS/GSC-
API-sync/AI-metadata-writer as disproportionate for a self-hosted single-
tenant app; the single-page-per-site architecture also ruled out a few listed
items, like a redirect manager, as not applicable).

`src/types.ts` gained `SiteSeoConfig` (`schema_type: 'none' | 'LocalBusiness'
| 'AutoRepair'`, `business_phone`, `business_address`,
`og_title_override`/`og_description_override`) and a `seo_config: string |
null` column on `Site`, plus `alt?: string` on gallery images and
`image_alt?: string` on `HeroBlockContent`. Backend: `seo_config TEXT
DEFAULT '{}'` migration on `sites` (same guarded pattern as `thumbnail_url`),
persisted through `POST`/`PUT /api/sites`.

**Server-side meta tag injection** (`buildSiteMetaHtml()` in
`backend/server.js`, same pattern the pre-existing `/funnel/:slug` route
already used) — necessary because crawlers/link-unfurlers (Facebook, Twitter,
iMessage, Google) largely don't execute JS, so client-side `document.title`/
meta changes are invisible to them; only a real server-rendered `<title>`/meta
block works. Injects: canonical `<link>` (always the real
`<subdomain>.homeslab.uk` URL, even when served from the internal
`/site/:subdomain` preview path — fixes a real duplicate-content problem,
since the same content was reachable at two URLs), meta description, OG/
Twitter tags (title, description, `og:site_name`, image — falls back to the
first Hero block's image if no custom thumbnail is set), `theme-color`
(tinted to the site's own accent color), and `robots` (`noindex` on the
preview path and on paused sites, `index` otherwise — a paused site is now
told "don't index me" at three layers: the public API 404s it, the meta tag
noindexes it, and `robots.txt` disallows it). New routes: `GET
/robots.txt` and `GET /sitemap.xml`, both resolved by request **hostname**
(`resolveSiteFromHost()`), not path — a deliberately single-URL sitemap,
since each site here is one page with no multi-page routing. The existing
catch-all `app.get('*', ...)` and the `/site/:subdomain` route both now call
`buildSiteMetaHtml()` before sending `dist/index.html`.

**JSON-LD structured data**: opt-in only (empty/`none` by default — partial-
but-invalid schema is worse than none), `LocalBusiness` or the more specific
`AutoRepair` subtype, editable via a new "Structured Data" section in
`SitesView.tsx`'s Settings modal (business type dropdown + conditional phone/
address fields).

**Alt text**: added to the Hero block's background image and each Image
Gallery photo (`SiteBuilderView.tsx`'s `BlockContentEditor`), separate from
the existing visible caption field, wired into `SiteBlockRenderers.tsx`'s
`<img>` tags — accessibility (screen readers) and Google Images SEO, falls
back to the caption when alt is left blank.

**SitesView.tsx** also gained a live character counter on the Meta
Description field (color-coded green → amber near 155 chars → red past it,
with a "Google will likely truncate this" hint over the limit).

**Known loose end, not yet verified (bash/tsc unavailable this session):**
`SitesView.tsx`'s `handleSave()` builds its save payload with `theme_config:
{...} as ThemeConfig` and (now) `seo_config: {...} as SiteSeoConfig` — real
nested objects — then passes it to `api.updateSite()`/`createSite()`, both
typed `Partial<Site>`, where `theme_config`/`seo_config` are `string | null`
(the shape the API actually *returns*, since both columns are stored as JSON
text). This almost certainly type-checks as an error under `npm run lint`
(`tsc --noEmit`) — but it's a pre-existing pattern from `theme_config`, not
something introduced by adding `seo_config`, and works fine at runtime since
`request()` just `JSON.stringify()`s the whole payload either way. Matched
the existing pattern rather than unilaterally restructuring `Partial<Site>`'s
dual use (received-shape vs. sent-shape) without being able to verify a fix
compiles. Worth checking next `npm run lint` run.

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

9. **"Failed to fetch" on a 1.28GB `.mkv` reformat upload, over LAN — a
   completely different bug that looked identical to #8.** Root cause:
   `ALLOWED_UPLOAD_MIME.video` in `backend/server.js` never included
   `video/x-matroska` (.mkv) or `video/x-msvideo` (.avi) — only mp4/webm/
   quicktime/ogg. The client-side check in `MediaField.tsx` was too loose
   (`file.type.startsWith('video/')`), so it let the .mkv through; the
   server's multer `fileFilter` then correctly rejected it — but for a file
   this large, the rejection tore the connection down while the browser was
   still mid-upload, and that abrupt cutoff surfaced as a generic
   "Failed to fetch" instead of a clean 400 with our actual error message.
   `docker logs` showed nothing at all, because the multer error-handling
   path never had a `console.error` in it to begin with. First fix attempt
   added `video/x-matroska`/`video/x-msvideo` — still failed, because Windows
   actually reported this file's MIME type as plain `video/matroska` (no
   "x-" prefix), a different string than the more commonly-referenced
   `video/x-matroska`. Both variants (plus `video/avi` alongside
   `video/x-msvideo`) are now allowed, confirmed against the actual MIME
   string the browser sent. ffmpeg reads any of these containers fine and
   always outputs .mp4 regardless of input container, so there was no real
   reason to reject any of them. Also replaced the loose client-side prefix
   check with one that validates against the exact same allowed list
   (`detectMediaType()` in `MediaField.tsx`, with an extension-based fallback
   for the cases where the browser reports an empty `file.type`), and added
   `console.error` on both multer rejection paths in `server.js` so this
   isn't silent next time.
   **Lesson: diagnosed by first ruling out the already-known Cloudflare cause
   (#8) via a clean LAN test that still failed, then requesting the exact
   file size (1.28GB — nowhere near the 2GB app cap) and noticing the
   extension was `.mkv`, not `.mp4`. When a "Failed to fetch" recurs after a
   previous root cause was already fixed, don't assume it's the same bug
   recurring — re-verify from scratch, because a response-less failure can
   have several unrelated causes that all look identical from the browser's
   side.**

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
