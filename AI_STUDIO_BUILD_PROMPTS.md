# Google AI Studio build prompts — Tags/Segments, Campaigns, Booking Funnel, Missed-Call Text-Back, Social Planner

Five features, written as five separate, self-contained prompts. **Paste and run them one at a time, in order, in separate AI Studio sessions** — not all at once. Reasons: AI Studio's Pro quota is limited (per this repo's own CLAUDE.md), each phase after Phase 1 depends on the previous one's tables/components existing, and isolating each change makes it possible to `npm run lint`, test locally, and deploy after every phase instead of debugging one giant simultaneous change if something breaks. Recommended order: **1 → 2 → 3 → 4 → 5**. Phase 3 doesn't depend on 1/2 and can be moved earlier if you want the booking funnel live sooner.

Every prompt below starts with the same "Ground rules" block — paste it as part of each prompt (it's short and repeating it costs little quota compared to a mistake that touches a protected file or adds a dependency).

**This file lives in the repo and is committed to git on purpose** — anything written to this folder that isn't committed gets deleted by the deploy webhook's `git clean -fd` on the next push (that's what happened to the first version of this file). Keep updating it and let it get pushed along with whatever else goes to `main`.

---

## Progress tracker

Update this section yourself, or tell Claude/Cowork "I finished Phase X" and ask it to update this file + summarize what actually got built (Claude can read the real diff once it's synced back to this repo, not just trust that AI Studio followed the prompt exactly).

- [ ] **Phase 1 — Tags & Segments**: not started
- [ ] **Phase 2 — Campaigns (broadcasts)**: not started — blocked on Phase 1, and needs a marketing-SMS consent checkbox added to lead-capture forms before real sending (see TCPA note below)
- [ ] **Phase 3 — Self-Service Booking Funnel**: not started
- [ ] **Phase 4 — Missed-Call Text-Back**: not started — blocked on deciding new Twilio number vs. porting the existing shop number, then setting up Twilio
- [ ] **Phase 5 — Social Planner**: not started — auto-posting half blocked on Meta App Review (2-4 weeks, separate from any code work)

---

## Ground rules (include at the top of every phase prompt)

```
This is Workshop: Ragnarök, a real auto shop management app (React 19 + TypeScript +
Vite 6 + Tailwind CSS 4 frontend, Express 4 + better-sqlite3 backend, JWT auth). It is
a live production app on a home server, not a prototype — be conservative and additive.

Rules, don't deviate:
1. Do not modify these files unless the task explicitly requires it, and if you must,
   say so clearly at the end of your response so it can be mirrored to a second
   "protected files" backup repo before pushing: backend/Dockerfile,
   backend/ingestion.js, docker-compose.yml, package-lock.json,
   backend/package-lock.json, post-rebuild.sh, src/components/ChatWidget.tsx,
   backend/db.js, GEMINI.md, and any file under public/ (logos/videos).
2. Do not add any new npm dependency unless there is truly no way to do this with
   what's already installed. This app deliberately avoids new dependencies for
   exactly this kind of feature — see backend/sms.js (raw fetch() to Twilio's REST
   API instead of the twilio npm package) and the in-memory rate limiter in
   backend/funnel-routes.js (no Redis/queue library) for the established pattern to
   copy. Adding a dependency touches package-lock.json, which is protected (see
   rule 1) — flag it loudly if you believe one is truly unavoidable, don't just add it.
3. All new DB tables/columns must be additive, non-destructive migrations: check
   column/table existence before ALTER TABLE (copy the exact pattern already used
   throughout backend/server.js's startup migration block). Never DROP or rewrite
   existing data. If a CHECK constraint needs a new allowed value, use the exact
   guarded table-rebuild pattern already used to add 'review_request' to
   sms_messages.trigger_type — find that block in server.js and replicate its shape.
4. Every new table needs a user_id column; every new authenticated route must filter
   by req.user.id. This app scopes all data per logged-in user.
5. Any PUT/PATCH endpoint must be a true partial update: read the existing row first,
   only overwrite a column if the request body actually contains that key
   ('field' in req.body, not a falsy check). Read the CLAUDE.md bug-log entry titled
   "The real, deeper cause of 'my image goes away'" before writing any update route —
   it documents a real production bug from exactly this mistake. Do not repeat it.
6. Any outbound email/SMS call must be wrapped in its own try/catch so a failure
   there never blocks the primary DB write or the API response — copy the pattern
   in backend/funnel-routes.js's POST /:slug/submit handler.
7. Any debounced autosave must be keyed per-entity-id (Record<id, Timeout>), never
   one shared timer ref — this app has a documented bug class from getting this wrong.
8. Don't change or remove any existing feature's behavior. Only add to shared files
   (types.ts, src/lib/api.ts, backend/server.js, Sidebar.tsx) — don't restructure
   existing exports/routes/types while you're in there.
9. When done: run `npm run lint` (this repo's lint script is `tsc --noEmit`) and fix
   every error it reports before considering the task finished.
```

---

## Phase 1 — Contact Tags & Segments

```
[paste Ground rules block above first]

Add a tagging and saved-segment system for Customers. This is the foundation for a
bulk email/SMS campaign feature coming in a later session, so build the segment
resolution logic as one reusable server-side function, not something baked into a
single route.

Backend:
- New table `tags`: id, user_id, name TEXT, color TEXT DEFAULT '#6366f1', created_at.
  UNIQUE(user_id, name).
- New join table `customer_tags`: customer_id, tag_id, PRIMARY KEY(customer_id, tag_id),
  both columns ON DELETE CASCADE referencing customers(id) and tags(id).
- New table `segments`: id, user_id, name TEXT, filters_json TEXT, created_at, updated_at.
  filters_json shape (keep it a flexible JSON blob so it's easy to extend later):
  { tagIds: number[], tagMatch: 'any' | 'all', hasEmail?: boolean, hasPhone?: boolean,
    lastVisitBeforeDays?: number, lastVisitAfterDays?: number }
- New backend/segments.js exporting `resolveSegmentCustomers(userId, filters)` — takes
  a filters object (either loaded from a saved segment's filters_json or passed ad-hoc)
  and returns the matching Customer rows. Write this once here; a later phase will
  import and reuse it exactly as-is for campaign sending, so keep its signature stable.
- Routes: GET/POST/DELETE /api/tags, PUT /api/tags/:id (rename/recolor).
  POST /api/customers/:id/tags { tag_id }, DELETE /api/customers/:id/tags/:tagId.
  GET/POST/PUT/DELETE /api/segments. GET /api/segments/:id/customers (resolves and
  returns the matching customers using resolveSegmentCustomers). Also support an
  ad-hoc preview: POST /api/segments/preview { filters } -> { count, customers }
  (a later Campaigns UI needs a live "N recipients" count before saving anything).
- Extend GET /api/customers to also return each customer's tags (joined array).

Frontend:
- New small TagBadge component (colored pill) — check existing badge/pill styling
  already used elsewhere in the app (e.g. status badges in JobsView.tsx or
  SiteLayersPanel.tsx) and match that visual language rather than inventing a new one.
- src/components/CustomersView.tsx: add a tag multi-select (with inline "create new
  tag" support) to the customer edit form; show tag badges in the customer list/table;
  add a tag filter control near the existing search box, folded into the existing
  `filteredCustomers` logic so the existing CSV export button keeps respecting whatever
  is currently filtered (it already does this for the search box — same idea).
- New small "Manage Tags" modal reachable from CustomersView: rename, recolor, delete.
- New reusable `SegmentPicker` component: lets the user either build an ad-hoc filter
  (tag selection + the couple of extra conditions above) with a live recipient-count
  preview (call POST /api/segments/preview as filters change, debounced), or pick a
  previously saved segment from a dropdown, plus a "Save this as a segment" action.
  Build this as a real standalone component (not inlined into CustomersView) — a
  later Campaigns feature will reuse it unchanged for audience selection.
- src/types.ts: add `Tag`, `Segment`, `SegmentFilters` interfaces; add `tags?: Tag[]`
  to the `Customer` interface.

Do not build any campaign-sending feature in this session — that's a separate later
phase. Do not add tagging to Vehicles or Jobs, customers only for now.
```

---

## Phase 2 — Bulk Email/SMS Campaigns (Broadcasts)

*Requires Phase 1 already merged and deployed (tags, segments, SegmentPicker, resolveSegmentCustomers).*

*Before running this phase for real SMS sends: add an explicit "I agree to receive text messages from [shop]" consent checkbox to wherever phone numbers get collected (funnel lead forms, the Phase 3 booking form, manual customer entry) and only let campaign SMS target customers who checked it. TCPA requires prior express written consent for marketing texts — violations run $500-$1,500 per message with no cap. Email broadcasts don't need this (just the unsubscribe link, already in the spec below); this only applies to the SMS channel.*

```
[paste Ground rules block above first]

Add a "Campaigns" feature: compose an email or SMS message, target it at a saved
Segment (or an ad-hoc filter) from the Phase 1 tagging system, and send it as a
one-time broadcast to every matching customer, with visible send progress and results.

Backend:
- New table `campaigns`: id, user_id, name TEXT, channel TEXT CHECK(channel IN
  ('email','sms')), subject TEXT (email only, nullable), body TEXT, segment_id
  INTEGER REFERENCES segments(id) (nullable), filters_json TEXT (nullable — a
  snapshot of ad-hoc filters when segment_id is null, so a send is reproducible even
  if segments change later), status TEXT CHECK(status IN
  ('draft','scheduled','sending','sent','failed')) DEFAULT 'draft', scheduled_at TEXT,
  sent_at TEXT, created_at, updated_at.
- New table `campaign_recipients`: id, campaign_id, customer_id, status TEXT CHECK
  (status IN ('pending','sent','failed','skipped')) DEFAULT 'pending', error_message
  TEXT, sent_at TEXT. Populate this by resolving the audience ONCE when a send starts
  (via Phase 1's resolveSegmentCustomers) and inserting one row per recipient — this
  makes a send resumable/inspectable and guarantees the audience can't shift mid-send.
- Add `'campaign'` to the sms_messages.trigger_type CHECK constraint using the exact
  guarded table-rebuild pattern already used for 'review_request' (ground rule 3).
- Additive migration: `customers.email_opt_out INTEGER DEFAULT 0`,
  `customers.sms_opt_out INTEGER DEFAULT 0`, `customers.sms_marketing_consent
  INTEGER DEFAULT 0` (set true only when the new consent checkbox was actually
  checked at signup — see the TCPA note above this prompt). Every campaign send
  must skip opted-out customers, skip any customer with no email (for email
  campaigns) or no phone (for SMS campaigns), and for SMS campaigns specifically
  skip anyone with sms_marketing_consent = 0 — log those as status='skipped' in
  campaign_recipients, not 'failed'.
- Routes: POST/PUT/DELETE /api/campaigns, GET /api/campaigns (list, with a computed
  recipient/sent/failed count per campaign), GET /api/campaigns/:id (detail +
  recipients list). POST /api/campaigns/:id/send must return immediately (job-style,
  same two-phase pattern already used for video compression in server.js — return
  right away, do the actual sending afterward) and process recipients in small
  batches with a short delay between each, reusing/mirroring the same in-memory
  rate-limiter throttling style already in backend/funnel-routes.js rather than
  adding any queue/worker dependency. Update each campaign_recipients row and the
  parent campaign's status as it progresses.
- Every campaign email must have an unsubscribe link appended to the body. Add
  GET /api/public/unsubscribe/:token -> sets email_opt_out=1 for that customer and
  shows a simple confirmation page. Use an opaque per-customer token (not a raw
  customer id) — e.g. HMAC the customer id with a server secret, or store a random
  token column on customers; don't leak sequential IDs in a public URL.
- Every campaign SMS body should mention "reply STOP to opt out" in the copy (Twilio
  handles STOP automatically at the carrier level once real Twilio credentials exist,
  but the message text should say it regardless of whether Twilio is configured yet).

Frontend:
- New src/components/CampaignsView.tsx. Add to Sidebar.tsx's nav array, placed right
  after 'texts' and before 'automations' — label "Campaigns", pick a lucide-react
  icon not already used elsewhere (Megaphone is taken by Funnels; consider Send or
  Radio).
- Campaign list grouped/filterable by status. Create/edit modal: name, channel
  toggle (email/sms), the Phase 1 SegmentPicker for audience selection (shows a live
  recipient count — for SMS, the count should reflect only consented customers), subject +
  body (reuse src/components/RichTextEditor.tsx for email; a plain textarea with a
  character counter for SMS), a "send a test to myself" button, then Save Draft /
  Send Now / Schedule for later.
- Campaign detail view: while status='sending', poll GET /api/campaigns/:id every
  1-2 seconds (same polling pattern MediaField.tsx already uses for video-compress
  progress) and show a live sent/pending/failed/skipped count plus a per-recipient
  status table.
- A consent checkbox ("I agree to receive text messages from [shop name]") added to
  every place a phone number is collected: funnel lead-capture forms and the manual
  Add Customer form at minimum. Wire it to the new sms_marketing_consent column.
- src/types.ts: add `Campaign`, `CampaignRecipient` interfaces. Add `'campaign'` to
  the `SmsTriggerType` union, and add a matching entry to TRIGGER_META in
  src/components/TextsView.tsx (follow the existing entries' shape exactly) so
  campaign sends show up correctly labeled in the existing Texts log instead of
  looking unlabeled/broken there.

No A/B testing, no open/click tracking, no multi-step drip sequences in this phase —
one-shot broadcasts only.
```

---

## Phase 3 — Self-Service Booking Funnel

*Independent of Phases 1/2 — can be run before them if you want this live sooner.*

```
[paste Ground rules block above first]

Important architecture note before you start: this app has TWO separate page-building
systems and they must not be confused. `funnels` (backend/funnel-routes.js,
src/components/FunnelsView.tsx, src/components/FunnelPageView.tsx) are simple
fixed-layout single-page lead-capture forms — Funnel.layout is currently a fixed union
'classic' | 'modern' | 'video'. Separately, `sites` (src/components/SiteBuilderView.tsx,
site_blocks table) are a flexible drag-and-drop block canvas. Sites already support
embedding an existing Funnel inline via the 'funnel' entry in the SiteBlockType union
(see src/types.ts and SiteBlockRenderers.tsx) — so turning a Funnel into a booking page
by adding a new layout value automatically makes it usable both as its own public page
AND embeddable inside any Site, with no Sites-side changes required, AS LONG AS the
'funnel' site-block renderer doesn't hardcode any assumption that only the classic
contact-form layout will ever be embedded. Check that renderer and adjust it if needed.

Task: add a real self-service appointment-booking option, exposed as a new Funnel
layout, so it's usable standalone (its own public URL) and embeddable in a Website.

Backend:
- Confirm Funnel.layout has no CHECK constraint (it reads as a plain TEXT column with
  a TypeScript-level union today) and add 'booking' as a new valid value if so; if it
  turns out there IS a CHECK constraint, use the same guarded-rebuild migration
  pattern referenced in the ground rules.
- Additive shop_settings columns (follow the exact existing migration pattern used
  for every other shop_settings column in server.js): booking_open_time TEXT DEFAULT
  '08:00', booking_close_time TEXT DEFAULT '17:00', booking_slot_minutes INTEGER
  DEFAULT 60, booking_days_closed TEXT DEFAULT '[0]' (JSON array of closed weekday
  numbers, 0=Sunday), booking_min_notice_hours INTEGER DEFAULT 2,
  booking_max_concurrent INTEGER DEFAULT 1 (how many appointments may share one slot).
- New public route GET /api/public/funnels/:slug/availability?date=YYYY-MM-DD —
  computes open start times for that date from the settings above, excluding times
  that would overlap an existing `appointments` row for that user_id/date beyond
  booking_max_concurrent (compare using duration_minutes overlap, not exact-time
  match), and excluding anything inside the min-notice window from right now.
- New public route POST /api/public/funnels/:slug/book — body: name, phone, email,
  vehicle_year, vehicle_make, vehicle_model, date, time, notes. Re-check the
  requested slot is still available server-side before inserting (race-condition
  guard — two people could be booking the same slot at once). Reuse
  backend/funnel-routes.js's existing findExistingCustomer()/dedup logic and its
  existing in-memory rate limiter for this new endpoint too. On success: find-or-
  create the Customer + Vehicle exactly like the existing lead-capture submit
  handler does, insert an `appointments` row (title e.g. "Booking: <service_type or
  funnel.headline>", appointment_type='booking', duration_minutes=
  booking_slot_minutes), then best-effort send a confirmation SMS/email to the
  customer and an admin alert to the shop, reusing sendEmail/sendSms exactly like
  the existing submit handler's try/catch pattern. Add 'booking_confirmation' to the
  sms_messages.trigger_type CHECK constraint alongside whatever Phase 2 may have
  already added there — if both phases have landed, do this as one combined
  guarded rebuild, don't rebuild that table twice.
- Verify (don't just assume) that a booking created this way shows up correctly in
  the existing CalendarView with no CalendarView code changes needed, since it's
  just a normal appointments row.

Frontend:
- FunnelPageView.tsx: add a new BookingFunnelLayout component alongside the existing
  ClassicFunnelLayout/ModernFunnelLayout/VideoFunnelLayout, wired into the same
  `if (funnel.layout === ...)` chain. Reuse the funnel's existing headline/media
  fields for the top of the page, then a date picker plus a grid of available time
  buttons (call the new availability endpoint, refetch whenever the selected date
  changes), then the booking form (name/phone/email/vehicle), submit to the new
  /book endpoint, then show a confirmation state.
- FunnelsView.tsx: add "Booking" as a 4th layout choice next to Classic/Modern/Video
  wherever that layout picker currently lives when creating/editing a funnel.
- SettingsView.tsx: add a "Booking Availability" section (open/close time, slot
  length, closed days, min notice hours, max concurrent) writing to the new
  shop_settings columns — match the existing SettingsView form patterns exactly.
- src/types.ts: extend Funnel['layout'] and PublicFunnel['layout'] to include
  'booking'; add the new fields to the ShopSettings interface; add
  'booking_confirmation' to SmsTriggerType plus its TRIGGER_META entry in
  TextsView.tsx.

No multi-staff/multi-bay separate calendars, no self-service reschedule/cancel, no
payment-at-booking in this phase — booking creation only.
```

---

## Phase 4 — Missed-Call Text-Back & Call Log (Twilio-ready, dormant until configured)

*Before this phase: decide whether you want a new Twilio number (fast, but customers dial a different number than the one on your Google Business listing/website until you update those) or to port your existing shop number into Twilio (keeps the same number, but is an operational step with real downtime risk during the port, not a code step). Pick one before AI Studio builds around an assumption.*

```
[paste Ground rules block above first]

Important context: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER are
not set on this server yet (see backend/sms.js — SMS sending already handles this by
logging 'not_configured' and no-op'ing rather than breaking). Build this feature the
same way: fully implemented, but silently inert and clearly logged as not-configured
until those env vars exist, so nothing breaks today and it activates automatically
the moment Twilio is actually set up, with zero further code changes needed then.

Backend:
- New table `calls`: id, user_id, from_number TEXT, to_number TEXT, call_sid TEXT,
  status TEXT CHECK(status IN ('completed','no-answer','busy','failed','voicemail')),
  duration_seconds INTEGER, customer_id INTEGER REFERENCES customers(id) (nullable —
  match by phone number against existing customers, similar in spirit to
  findExistingCustomer in funnel-routes.js, but do NOT auto-create a new Customer
  from a bare missed call, only log the call), text_back_sent INTEGER DEFAULT 0,
  created_at.
- New public webhook routes (Twilio POSTs to these directly — no JWT, since Twilio
  isn't a logged-in user. Verify Twilio's request signature the same careful way
  backend/email.js already verifies Svix signatures on the inbound-email webhook —
  do not skip signature verification just because Twilio isn't configured yet;
  write it correctly now so it's secure the moment it goes live):
  - POST /api/webhooks/twilio/voice — returns TwiML that <Dial>s the shop's own
    phone number (shop_settings.shop_phone) with an `action` callback URL pointing
    at the next route, so the app finds out afterward whether the call was answered.
  - POST /api/webhooks/twilio/voice/status — the <Dial> action callback. If Twilio's
    DialCallStatus is 'no-answer', 'busy', or 'failed', insert a `calls` row and
    immediately send an auto text-back to the caller via the existing sendSms()
    (e.g. "Sorry we missed your call! Reply here or we'll call you back shortly —
    <shop name>."), wrapped in the same best-effort try/catch pattern used
    everywhere else so a Twilio hiccup here can never make this webhook response
    fail (Twilio is waiting on a fast 200 response).
- No new automated route is needed to point Twilio's phone number at these webhooks —
  that's a one-time manual step in the Twilio console after a real account exists.
  Leave a clear comment saying so (set the number's Voice webhook to
  https://<your-domain>/api/webhooks/twilio/voice).

Frontend:
- Add a "Calls" tab inside src/components/TextsView.tsx (same "communications log"
  mental model as the existing SMS conversation list — don't create a whole separate
  nav item for this) showing: caller number (with matched customer name if found),
  time, duration, status, whether a text-back was sent. If TextsView.tsx is already
  large enough that this meaningfully hurts readability, a separate CallsView.tsx
  reachable the same way is fine too — use your judgment, just keep it visually
  consistent with the existing SMS UI.
- SettingsView.tsx: near wherever shop_phone is already configured, show a small
  "Twilio: configured / not connected yet" status indicator, reusing the amber
  not_configured styling already established in TextsView's STATUS_META.

No call recording, no IVR menu, no in-app click-to-call dialer in this phase (outbound
calling needs the Twilio Voice JS SDK plus browser mic permissions — a materially
bigger feature, not in scope here).
```

---

## Phase 5 — Social Planner (scheduler now, real auto-posting deferred to real API keys)

*The scheduler/calendar half is fine to build any time. The real auto-posting half needs Meta App Review + Business Verification (2-4 weeks, kicked off yourself in Meta's developer portal) — that's independent of any code work, so don't expect live auto-posting the same week this phase is built.*

```
[paste Ground rules block above first]

Important context: real Facebook/Instagram auto-posting requires a Meta Graph API
app that has been through Meta's app review process — that's an account-level
process outside any single coding session, not something that can be "finished" by
writing more code today. Build the honest version of this feature: a real content
calendar/scheduler that stores and queues posts, with the actual publish call
scaffolded exactly like backend/sms.js's sendSms() — clearly logged and stored as
'not_configured' until real platform credentials exist in the environment, so this
never pretends to have posted something it didn't.

Backend:
- New table `social_posts`: id, user_id, platform TEXT CHECK(platform IN
  ('facebook','instagram','google_business')), caption TEXT, media_url TEXT
  (reuse the existing POST /api/uploads + MediaField.tsx flow for the image/video,
  don't build a separate upload path), scheduled_at TEXT, status TEXT CHECK(status
  IN ('draft','scheduled','posted','failed','not_configured')) DEFAULT 'draft',
  posted_at TEXT, error_message TEXT, created_at.
- New backend/social.js, mirroring backend/sms.js's exact shape: an
  isSocialConfigured(platform) check for the relevant env vars per platform (e.g.
  META_PAGE_ACCESS_TOKEN + META_IG_BUSINESS_ID for facebook/instagram,
  GOOGLE_BUSINESS_REFRESH_TOKEN for google_business), and a publishPost(post)
  function that no-ops with a clear not_configured status/log until those exist —
  so the rest of the app never needs to change again once real credentials are
  added later.
- Extend the existing hourly runAutomationSweeps() in backend/server.js with one
  more sweep: find social_posts where status='scheduled' AND scheduled_at <= now,
  call publishPost(), update status/posted_at/error_message accordingly. Reuse the
  existing sweep/interval mechanism — do not add a second cron/scheduling mechanism.
- Routes: standard CRUD GET/POST/PUT/DELETE /api/social-posts, scoped by user_id
  like everything else in this app.

Frontend:
- New src/components/SocialView.tsx, added to Sidebar.tsx's nav (or folded into an
  existing marketing-adjacent page like FunnelsView if you'd rather not add another
  top-level nav item — your call, keep the nav from getting cluttered). A
  calendar/list view of draft and scheduled posts, a compose modal (platform picker,
  caption, MediaField for the image/video, date/time picker), and a clear
  "<platform>: not connected yet" banner per platform reusing the same amber
  not_configured styling pattern already established for Twilio/SMS.

No analytics/engagement metrics pulled back from the platforms, no multi-image
carousel posts, and no ad-campaign management (Facebook/Google Ads is a materially
different, larger API surface than organic posting — not in scope here) in this phase.
```

---

## After all five phases

Once Phase 4 is deployed, flipping missed-call text-back (and the earlier campaign
SMS/booking-confirmation texts) from dormant to live is just:
1. Sign up for Twilio, buy a phone number (or port your existing one — see the note
   at the top of Phase 4).
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env` on
   the server.
3. In the Twilio console, set that phone number's Voice webhook to
   `https://<your-domain>/api/webhooks/twilio/voice`.

No code changes needed for that last step — it was all built to activate automatically.

Remember the standing rule from this repo's CLAUDE.md: if any phase ends up touching
a protected file, push the `images` mirror repo first, then Workshop-Ragnarok — pushing
Workshop-Ragnarok first will let the deploy webhook silently restore the old protected
file before your fix ever lands.
