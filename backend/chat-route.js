// chat-route.js
//
// Cooper & Roscoe shop assistant — Gemini API version. Full CRM tool access
// (customers, vehicles, jobs, appointments, inventory, service history,
// receipts, payments, tags/segments, texts/private contacts, and shop
// settings — read AND write, but never delete) plus live browsing of the
// full 304,923-vehicle manual library via your existing /api/page route.
// The app's own User Guide is baked in below (APP_USER_GUIDE) so the bot
// can answer "how do I use this app" questions, not just data lookups.
//
// 2026-07-17 upgrade: broadened tool coverage across every major data
// domain in the app (previously customers/jobs/appointments/parts/manuals
// only). The manual-browsing tools (find_vehicle_manual, browse_manual) and
// their related SYSTEM_PROMPT instructions were deliberately left untouched
// — that path already works correctly and this upgrade doesn't change it.
// New tools follow the same two ground rules the original write tools
// already established: every query is scoped to the caller's own userId,
// and nothing added here can delete a record — only create, append, or
// update existing fields (e.g. correcting a customer's phone number,
// adjusting inventory stock with a logged reason, changing a job's status).
//
// SETUP:
//   npm install @google/genai
//   Add to your .env:  GEMINI_API_KEY=AIza...
//   Get a free key at https://aistudio.google.com -> Get API key
//   (Free tier: no credit card, ~15 req/min, ~1,500 req/day on Flash models)
//
// WIRE IT UP in server.js:
//   const chatRoute = require('./chat-route');
//   app.use('/api/chat', authenticateToken, chatRoute); // reuse your existing JWT middleware
//
// IMPORTANT: verify whether /api/page requires auth. This file forwards the
// caller's Authorization header to that internal request either way, so it
// works whether or not that route is protected.

const express = require('express');
const { GoogleGenAI, Type } = require('@google/genai');
const db = require('./db'); // however you already export your better-sqlite3 instance

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = 'gemini-2.5-flash'; // fast + generous free tier; swap to gemini-2.5-pro if you need stronger reasoning and don't mind a much lower free daily cap
const MODEL_FALLBACK = 'gemini-2.5-flash-lite'; // separate capacity pool — used if MODEL is overloaded

// Baked-in User Guide — how the app itself works, feature by feature.
// Update this by re-exporting the User Guide and pasting the new text here.
const APP_USER_GUIDE = `USER GUIDE

WORKSHOP:
RAGNARÖK
How to Use It — A Practical, Step-by-Step Guide to
Running Your Shop

Owner / Operator: Josh (usmc6123)

Production URL: workshop.homeslab.uk

Companion Document: Complete System Manual (technical reference)

Document Version: July 2026 Edition

  10                                      2 min                    304K+
  WALKTHROUGHS                            TO YOUR FIRST INVOICE    MANUALS AT YOUR FINGERS

---

Table of Contents

01 Logging In & Getting Oriented
   First login and a tour of the main layout

02 Adding a Customer & Their Vehicle
   Building out your customer base

03 Creating & Managing a Job Ticket
   From intake to completed work order

04 Adding Photos to a Job
   Before/after documentation

05 Scheduling Appointments
   Getting jobs on the calendar

06 Using the Manual Library
   Finding and reading factory service procedures

07 Looking Up Part Prices Nearby
   Using Find Nearby Price

08 Creating an Invoice
   Print or PDF, with tax and labor handled for you

09 Setting Up Your Shop Profile
   Branding, tax rate, and labor rate — do this first

10 Dashboard & Quick Search
   Overview cards and universal search

11 Managing Inventory & Parts Stock
   Stock levels, adjustments, and receipt scanning

12 Using the Email Center
   Inbox, Sent Log, Templates, Compose, Reply/Forward, and Trash

13 Payments Dashboard
   Revenue summary and Stripe transaction history

14 Automations (n8n)
   Building custom shop workflow automations

15 Managing Users & Permissions
   Admin-only account and role management

16 Quick Reference & Tips
   Shortcuts and habits that save time

17 Using Texts & Private Contacts
   Two-way SMS, Inbox/Sent/Trash, and a separate personal contact list

---

SECTION 01

Logging In & Getting Oriented

WHERE: workshop.homeslab.uk

1       Go to workshop.homeslab.uk
        in any browser, on any device connected to the internet — the Cloudflare Tunnel makes it reachable without being on your
        home network.

2       Enter your admin username and password
        on the login screen.

3       You'll land on the main dashboard
        after logging in, with navigation to Customers, Jobs, Appointments, the Manual Library, and Settings.

 The main areas

 AREA                           WHAT IT'S FOR

 Customers                      Your customer list and their vehicles

 Jobs                           Work orders — open, in-progress, and completed

 Appointments                   Your schedule

 Manual Library                 Browse and search factory service manuals by vehicle

 Garage                         Vehicles you've saved for quick access

 Texts                          Two-way SMS with customers, plus a separate Private Contacts list

 Settings                       Shop branding, tax rate, labor rate, and admin/user management

    FIRST THING TO DO

    Before creating your first job, jump ahead to Section 09 and fill in your Shop Profile — your shop name, address, logo, tax rate,
    and labor rate all flow automatically into every invoice from that point on.

---

SECTION 02

Adding a Customer & Their Vehicle

WHERE: Customers tab

1     Open the Customers tab
      from the main navigation.

2     Click Add Customer
      and fill in their name, phone, email, and address.

3     Save the customer
      — you'll land on their customer detail page.

4     Click Add Vehicle
      on that page to attach a vehicle to them — enter year, make, model, and trim/variant if known.

5     Repeat "Add Vehicle"
      for any additional vehicles that customer owns — a customer can have as many as needed.

    HANDY SHORTCUT

    From a customer's vehicle, you can jump straight into the matching factory manual for that exact make/model without
    manually searching the library — look for the deep-link into the Manual Library on the vehicle card.

---

SECTION 03

Creating & Managing a Job Ticket

WHERE: Jobs tab

1     Open the Jobs tab
      and click New Job.

2     Select the customer and vehicle
      the job is for — you'll only see vehicles already attached to that customer, so add the vehicle first if it isn't listed (Section 02).

3     Describe the work
      being done and set the job status.

4     Add parts
      as line items — each with a description, quantity, and cost — to build out the parts subtotal.

5     Enter labor
      — either type in Hours Worked and let it auto-calculate labor cost using your shop's default labor rate, or type the labor cost
      directly. Either field can be edited any time; changing one updates the other.

6     Attach photos
      if needed (Section 04).

7     Save the job.
      You can come back and edit it any time before invoicing — nothing is locked until you print or export the invoice.

    GOOD TO KNOW

    Editing an existing job's labor cost directly will reverse-calculate the hours field to match, so the two numbers never fall out of
    sync.

---

SECTION 04

Adding Photos to a Job

WHERE: Inside a job ticket

1     Open the job
      you want to document.

2     Choose Add Photo
      and select Before or After to categorize it.

3     Upload the image
      — it's automatically compressed for storage, so there's no need to resize anything yourself first.

4     Add as many photos as needed
      — repeat for additional before/after shots.

5     Click any photo
      in the job to open it full-size in the lightbox viewer.

    WHERE THESE SHOW UP

    Every photo attached to a job automatically appears on both the Print Invoice view and the PDF download — you don't need to
    attach them separately when invoicing.

---

SECTION 05

Scheduling Appointments

WHERE: Appointments tab

1   Open the Appointments tab.

2   Click New Appointment
    and pick the customer and vehicle involved.

3   Set the date, time, and a short description
    of what the appointment is for.

4   Save
    — it will appear on your schedule view.

5   Link it to a job
    if the work is already ticketed, so you can jump between the appointment and the job details.

---

SECTION 06

Using the Manual Library

 WHERE: Manual Library tab

  Browsing to a vehicle

 1     Open the Manual Library
       and start from the nationality grouping (e.g. Domestic, Asian, European).

 2     Drill into make, then model, then year/variant
       using the tree navigator until you reach the vehicle you need.

 3     Select a section
       of the manual — the content loads in the main reading pane.

  Using the dual-pane reader
The Manual Library opens two independent panes side by side. This means you can have one procedure open on the left — say, a
wiring diagram — and a completely different section open on the right, like torque specs, without losing your place in either.
Navigating in one pane does not affect the other.

     FASTEST WAY IN

     If you're looking at a customer's vehicle, use the deep-link from their vehicle card instead of browsing manually — it jumps
     straight to that exact make/model in the library.

  Printing a manual section

 1     Open the section
       you want to print.

 2     Click the print icon
       in the reader toolbar — it opens a clean, print-formatted version of just that content.

---

SECTION 07

Looking Up Part Prices Nearby

WHERE: "Find Nearby Price" button, on a part or job line item

1     Click Find Nearby Price
      next to a part you're pricing out.

2     Enter your zip code
      if prompted (this currently isn't pulled from Shop Settings automatically — you may need to enter it each session).

3     Review the Google Shopping results
      shown for that part near your area.

    KNOWN LIMITATION

    The zip code isn't yet tied to your saved Shop Settings — it's a planned improvement. For now, expect to enter it manually.

---

SECTION 08

Creating an Invoice

WHERE: Inside a completed job

1     Open the job
      you're ready to invoice.

2     Review parts and labor
      — confirm everything is entered correctly, since this is what generates the totals.

3     Choose Print or Download PDF.
      Both pull your shop name, address, phone, and logo automatically from Shop Settings (Section 09) — if you haven't set those
      up yet, it falls back to generic "Workshop: Ragnarök" branding.

4     Check the tax line
      — it's calculated automatically as (Parts + Labor) × your shop's tax rate, and always shows, even when it's $0.00.

5     Any attached photos
      print or export automatically at the end of the invoice.

    PDF VS PRINT

    Use Print when you want to hand a physical copy to a customer on the spot. Use Download PDF when you want to email it or
    keep a digital copy on file.

---

SECTION 09

Setting Up Your Shop Profile

 WHERE: Settings → Shop Profile & Billing Preferences

Do this before your first real invoice — everything here feeds directly into every job and invoice you create afterward.

 1     Go to Settings
       and open Shop Profile & Billing Preferences.

 2     Enter your shop name, address, city, state, and phone number.

 3     Upload a logo
       if you have one — it appears on the invoice letterhead.

 4     Set your tax rate
       (as a percentage) — this applies automatically to every future invoice.

 5     Set your default labor rate
       — this is what auto-fills labor cost whenever you enter Hours Worked on a job.

 6     Save.
       Changes apply going forward; past invoices already generated won't retroactively change.

     IT'S SAFE TO SKIP AT FIRST

     If you don't fill this out right away, the app doesn't break — invoices simply fall back to default "Workshop: Ragnarök"
     branding and a $0.00-safe tax calculation until you do.

---

SECTION 10

Dashboard & Quick Search

WHERE: Dashboard tab (the screen you land on after login)

1     Check the overview cards
      at the top — total customers, active jobs, vehicles registered, and manuals indexed, at a glance.

2     Use the universal search bar
      to search by make, model, year, or a repair keyword (e.g. "brake pads") — it returns both matching vehicles and matching
      manual procedures in one dropdown.

3     Jump to a result
      — picking a vehicle from search takes you straight into the Manual Library for it; picking a procedure opens that section
      directly.

4     Scan the Recent Repair Orders, Upcoming Appointments, and Recent Clients panels
      below the search bar — each links straight through to the full Jobs, Appointments, or Customers view.

    FASTEST WAY TO A MANUAL

    Typing a repair keyword into the Dashboard search (not just a vehicle) can take you straight to a matching procedure without
    browsing the tree at all.

---

SECTION 11

Managing Inventory & Parts Stock

WHERE: Inventory tab

1     Open the Inventory tab
      to see every part currently in stock, with quantity on hand and reorder threshold.

2     Add a part manually
      with Add Item — name, part number, category, cost/sell price, supplier, and storage location.

3     Adjust stock levels
      from a part's row whenever you use, receive, or correct a quantity — every adjustment is logged with a reason.

4     Scan a supplier invoice or receipt
      with the receipt upload tool — a photo of the paper invoice is parsed automatically (via Gemini AI) into a list of line
      items you can review before importing; you choose whether each line creates a new part or updates an existing one's
      quantity.

5     Browse your Receipts Archive
      any time to search past scanned invoices by supplier or date.

    LOW STOCK

    Items at or below their reorder threshold are flagged automatically so you can see what needs reordering at a glance.

---

SECTION 12

Using the Email Center

WHERE: Email tab

1     Compose
      lets you send a one-off email or a saved Template to any customer, or a raw address — template variables like customer
      name and vehicle fill in automatically.

2     Inbox
      shows incoming replies from customers, automatically matched to their customer record when the sender's address is on
      file.

3     Sent Log
      is a searchable history of everything sent from the shop, filterable by date range.

4     Reply or Forward
      directly from an open message in Inbox or Sent Log — no need to start a new Compose from scratch.

5     Templates
      are reusable email bodies (e.g. "Invoice Ready", "Appointment Reminder") you can edit any time — changes only affect
      future sends.

6     Trash
      holds anything you delete from Inbox or Sent Log — nothing is gone for good until you restore it, use Delete Permanently
      on that one item, or Empty Trash to clear everything at once.

    GOOD TO KNOW

    Deleting an email from Inbox or Sent Log only moves it to Trash — it's fully recoverable until you explicitly permanently
    delete it or empty the trash.

---

SECTION 13

Payments Dashboard

WHERE: Payments tab

1     Open the Payments tab
      to see shop-wide revenue at a glance — total revenue, revenue this month, transaction count, and average transaction
      size.

2     Browse the transaction table
      below the summary cards — sortable by date, searchable by customer name, and filterable by date range or status
      (Succeeded, Failed, Refunded).

3     Click any row
      to open full payment detail, including the Stripe checkout session and payment intent IDs, with a link straight back to
      that job's invoice.

4     Payments arrive here automatically
      whenever a customer pays a job invoice online — see Section 08 for how a job gets a payable invoice (the "Pay Now"
      button on an unpaid job).

---

SECTION 14

Automations (n8n)

WHERE: Automations tab

1     Open the Automations tab
      to access the shop's embedded n8n workspace — a visual, drag-and-drop tool for building custom workflow automations
      (e.g. auto-texting a customer when a job status changes, syncing data to another system).

2     Build or edit a workflow
      directly inside that embedded workspace, the same as using n8n on its own.

    ADMIN-LEVEL TOOL

    This is a power-user area meant for building integrations — most day-to-day shop work happens in the other tabs.

---

SECTION 15

Managing Users & Permissions

WHERE: Manage Users (admin accounts only)

1     Open Manage Users
      — only visible to accounts with Administrator clearance.

2     Add a new user
      with a username, password, and role — Administrator (full CRM + credentials control) or standard User.

3     Edit an existing user's profile or role
      any time from their row.

4     Reset a user's password
      from the same screen if they're locked out.

5     Remove a user
      who no longer needs access — the system won't let the last remaining administrator demote or delete themselves, so the
      shop is never left without an admin.

---

SECTION 16

Quick Reference & Tips

 Fastest paths to common tasks

 YOU WANT TO...                                           FASTEST PATH

 Look up a customer's car in the manual                   Customer → Vehicle card → deep-link into Manual Library

 See what's scheduled today                               Appointments tab

 Hand a customer their invoice on the spot                Job → Print

 Email a customer their invoice                           Job → Download PDF

 Compare two manual sections side by side                 Manual Library — use both panes independently

 Fix your labor rate shop-wide                            Settings → Shop Profile — updates future jobs automatically

 Check this month's revenue                                Payments tab — summary cards at the top

 Get a customer paid online instead of in person           Job → Pay Now (unpaid jobs only) → sends a Stripe checkout link

 Turn a paper parts invoice into inventory                 Inventory → scan/upload the receipt photo → review → import

 Reply to a customer's email                               Email → Inbox or Sent Log → open the message → Reply

 Give a teammate shop access                               Manage Users (admin only) → Add User

 Habits worth building
  Set up Shop Profile (Section 09) before your first invoice — it saves redoing branding on every job.
  Attach before/after photos as you go on a job rather than all at the end — easier to remember what each one was for.
  Use the Garage to pin vehicles you reference often, rather than re-browsing the tree every time.
  Double-check parts and labor entries before printing an invoice — the tax total recalculates live, but it's still worth a glance
  before handing it to a customer.
  Reuse Email Templates for repeat messages (invoice ready, appointment reminders) instead of typing them fresh every time.
  Scan supplier receipts into Inventory as they come in rather than batching a big pile later — it keeps stock counts accurate.

  NEED THE TECHNICAL SIDE?

  For architecture, backups, troubleshooting, and admin-level details, see the companion "Complete System Manual" document.

---

SECTION 17

Using Texts & Private Contacts

WHERE: Texts tab

1     Open the Texts tab
      to see five sub-tabs: Conversations, Inbox, Sent, Trash, and Private.

2     Conversations
      is the main merged view — every text with a customer, sent or received, threaded together like a normal texting app.

3     Inbox
      shows only received texts, with an unread badge in the tab bar so you can see at a glance if a customer has replied.

4     Sent
      is a flat, non-threaded log of every outbound text — reminders, ready-for-pickup alerts, funnel leads, and manual sends.

5     Trash
      holds anything deleted from Conversations, Inbox, or Sent — restore it individually or use Empty Trash to clear everything.

6     Private
      is a completely separate rolodex, kept apart from the Customers list on purpose — Add Contact to create one, then tap it to
      text or call. Nothing here ever links to a job, vehicle, or funnel.

7     Call button
      appears next to a conversation once Twilio is connected — it rings your own cell first (set under Settings → Your Cell
      Number), then bridges you to the contact the moment you pick up.

    GOOD TO KNOW

    Two-way texting requires the Twilio phone number's inbound webhook to be configured — see the companion "Complete System
    Manual" document for the exact setup steps. Until then, texts still send fine, but customer replies won't come in.

---`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wraps ai.models.generateContent with retry-with-backoff on 503 (model
// overloaded), then falls back to a second model if the primary is still
// down after retries. Manual-browsing questions take several hops per user
// message, so any single hop hitting Google's free-tier overload window can
// otherwise kill the whole answer — this smooths that out.
async function generateWithRetry(params) {
  const attempts = [
    { model: MODEL, delay: 0 },
    { model: MODEL, delay: 1000 },
    { model: MODEL, delay: 2000 },
    { model: MODEL_FALLBACK, delay: 500 },
    { model: MODEL_FALLBACK, delay: 1500 },
  ];

  let lastErr;
  for (const { model, delay } of attempts) {
    if (delay) await sleep(delay);
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (err) {
      lastErr = err;
      const status = err.status || err.error?.code;
      if (status !== 503 && status !== 429) throw err; // only retry/fallback on overload or quota errors
      console.warn(`Gemini ${model} returned ${status}, trying next attempt...`);
    }
  }
  throw lastErr;
}

const SYSTEM_PROMPT = `You are Cooper & Roscoe, the friendly in-house assistant for
Workshop: Ragnarök — Josh's shop CRM. You help look up customers, vehicles, jobs,
appointments, and parts, browse the factory service manual library for any of
the 304,923 vehicles in the system, and you can also create new customers,
add vehicles to existing customers, and book appointments.

You can additionally look up inventory/parts stock, the shop's profile
settings (tax rate, labor rate, branding), Stripe payment/transaction
history, past sent/received email correspondence, a vehicle's separate
service history log, scanned supplier receipts, customer tags/segments,
and a quick shop-wide stats snapshot (active jobs, revenue this month,
unpaid jobs, low stock, upcoming appointments). You can also send a text
message on the shop's behalf (to a customer, a private contact, or a raw
number) and look up recent text conversations, and manage the separate
Private Contacts list (personal contacts kept deliberately apart from the
Customers CRM).

Beyond creating records and jotting notes, you can also UPDATE existing
ones: change a job's status or details (description, labor cost/hours,
priority, estimated completion), correct a customer's phone/email/address,
update a vehicle's mileage/VIN/color, reschedule an appointment's date or
time, adjust inventory stock up or down with a logged reason, edit an
inventory item's price/threshold/location, and generate a job's
customer-facing payment portal link. You do NOT have permission to delete
anything, ever — no customers, jobs, appointments, inventory, texts, or
any other record. If asked to delete something, say plainly that you're
not able to and the user needs to do it themselves in the app.

All data you look up or change is scoped to Josh's own shop only; you
never see or touch another shop's records. Mention these abilities
proactively when they're relevant to what someone's asking, even if they
didn't ask for them by name.

You also have the app's own User Guide memorized below — use it to answer
"how do I..." or "where do I find..." questions about USING THE APP ITSELF
(navigating the UI, invoicing, shop settings, photos, etc.), as opposed to
questions about specific data (which need your tools instead). If someone
seems stuck or unsure how to do something in the app, check this guide
before saying you don't know.

=== APP USER GUIDE ===
${APP_USER_GUIDE}
=== END APP USER GUIDE ===

When creating or booking something, confirm back to the user in plain language
what you did (e.g. "Added a 2019 Toyota Tacoma to John Doe's account" or
"Booked an appointment for Sarah Connor's Caprice on 2026-07-10 at 09:00").
If a tool returns an "ambiguous" result with multiple matches (this can
happen on any tool that looks someone up by name — create_vehicle,
create_appointment, add_customer_note, update_customer_contact_info,
tag_customer, send_text_message, adjust_inventory_stock,
update_inventory_item, and others), list the options clearly and ask the
user to pick one before trying again — never guess which one they meant.

For manual questions: first call find_vehicle_manual to get the vehicle's
uriPath, then call browse_manual with that uriPath to get its table of contents.
If the result is a list of section links (not actual procedure content), pick
the most relevant link and call browse_manual again with its href — repeat
until you reach real content. Don't guess at manual content; always browse to it.

If manual content includes image paths (e.g. "/images/DM10Q313/ford120/435388117/"),
always format each one in your reply as a markdown image using this exact
pattern: ![brief description](/api/image?src=THE_PATH) — for example:
![Engine component diagram](/api/image?src=/images/DM10Q313/ford120/435388117/)
Never print a raw image path as plain text; always wrap it this way so it can
be displayed inline.

Keep answers short and useful, like a quick answer from a coworker, not a
report. If you don't have a tool for something, say so plainly.`;

// ---------- Tool definitions (Gemini function-declaration format) ----------

const functionDeclarations = [
  {
    name: 'get_customer',
    description: 'Look up a customer by name (partial match) and their vehicles.',
    parameters: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING } },
      required: ['name'],
    },
  },
  {
    name: 'get_vehicle_history',
    description: 'Get service/job history for a specific vehicle by vehicle_id.',
    parameters: {
      type: Type.OBJECT,
      properties: { vehicle_id: { type: Type.INTEGER } },
      required: ['vehicle_id'],
    },
  },
  {
    name: 'search_jobs',
    description: 'Search job tickets by status and/or customer name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: 'Free-text status, e.g. Pending, In Progress, Completed (defaults to Pending)' },
        customer_name: { type: Type.STRING },
      },
    },
  },
  {
    name: 'get_upcoming_appointments',
    description: 'Get appointments in the next N days (default 7).',
    parameters: {
      type: Type.OBJECT,
      properties: { days: { type: Type.INTEGER } },
    },
  },
  {
    name: 'get_job_parts',
    description: 'List the individual parts (name, quantity, cost) used on a specific job.',
    parameters: {
      type: Type.OBJECT,
      properties: { job_id: { type: Type.INTEGER } },
      required: ['job_id'],
    },
  },
  {
    name: 'find_vehicle_manual',
    description: "Look up factory service manuals for a vehicle by make/model/year. Returns matching entries with their uriPath, needed to browse the manual with browse_manual.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        make: { type: Type.STRING },
        model: { type: Type.STRING },
        year: { type: Type.STRING },
      },
      required: ['make', 'model'],
    },
  },
  {
    name: 'browse_manual',
    description: "Fetch a manual page by URI. Start with a vehicle's uriPath (from find_vehicle_manual) to get its top-level table of contents (a tree of section links), then call this again with a child section's href to drill deeper, repeating until you reach actual procedure content (returned as content blocks) rather than another list of links.",
    parameters: {
      type: Type.OBJECT,
      properties: { uri: { type: Type.STRING } },
      required: ['uri'],
    },
  },
  {
    name: 'create_customer',
    description: "Create a new customer record.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        address: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_vehicle',
    description: "Add a vehicle to an existing customer. Pass the customer's name (partial match ok) — this tool looks up their customer_id automatically. If more than one customer matches, it returns the list instead of creating anything, so you can ask the user to clarify which one.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING },
        year: { type: Type.STRING },
        make: { type: Type.STRING },
        model: { type: Type.STRING },
        engine: { type: Type.STRING },
        vin: { type: Type.STRING },
        color: { type: Type.STRING },
        current_mileage: { type: Type.INTEGER },
      },
      required: ['customer_name', 'year', 'make', 'model'],
    },
  },
  {
    name: 'create_appointment',
    description: "Book an appointment. Pass the customer's name and enough of the vehicle's details (year/make/model, or just make/model) to identify it among that customer's vehicles — this tool resolves both to their IDs automatically. If the customer or vehicle can't be uniquely matched, it returns the possible matches instead of creating anything, so you can ask the user to clarify.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        customer_name: { type: Type.STRING },
        vehicle_description: { type: Type.STRING, description: "e.g. 'the Tacoma' or '2019 Toyota Tacoma' — used to match against that customer's vehicles" },
        date: { type: Type.STRING, description: "YYYY-MM-DD" },
        time: { type: Type.STRING, description: "HH:MM, 24-hour" },
        duration_minutes: { type: Type.INTEGER },
        notes: { type: Type.STRING },
      },
      required: ['title', 'customer_name', 'vehicle_description', 'date', 'time'],
    },
  },

  // ---- New read tools (added alongside the above; none of the existing ----
  // ---- tools above this point were modified). ----
  {
    name: 'list_vehicles',
    description: "Search all vehicles across every customer by make, model, year, and/or VIN (partial match). Use this when you don't already know which customer owns the vehicle, or want to find every vehicle matching a description — unlike get_customer, this doesn't require a customer name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        make: { type: Type.STRING },
        model: { type: Type.STRING },
        year: { type: Type.STRING },
        vin: { type: Type.STRING },
      },
    },
  },
  {
    name: 'get_job_details',
    description: 'Get full details for one job ticket by job_id: customer, vehicle, status, diagnosis/labor notes, cost, and payment status. Use get_job_parts alongside this for the parts line items.',
    parameters: {
      type: Type.OBJECT,
      properties: { job_id: { type: Type.INTEGER } },
      required: ['job_id'],
    },
  },
  {
    name: 'list_inventory',
    description: 'Search shop inventory/parts stock by name, category, or low-stock status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        category: { type: Type.STRING, description: 'one of: brakes, filters, fluids, electrical, engine, parts, other' },
        low_stock_only: { type: Type.BOOLEAN, description: 'if true, only return items at or below their reorder threshold' },
      },
    },
  },
  {
    name: 'search_appointments',
    description: "Search appointments by customer name and/or a date range (YYYY-MM-DD) — more flexible than get_upcoming_appointments, which only looks at the next N days from today.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING },
        start_date: { type: Type.STRING, description: 'YYYY-MM-DD' },
        end_date: { type: Type.STRING, description: 'YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'get_shop_settings',
    description: "Get the shop's own profile info: name, address, phone, tax rate, and default labor rate.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'list_payments',
    description: 'List recent Stripe payments/transactions for this shop, optionally filtered by status (succeeded, failed, refunded) or a date range.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: 'succeeded, failed, or refunded' },
        start_date: { type: Type.STRING, description: 'YYYY-MM-DD' },
        end_date: { type: Type.STRING, description: 'YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'search_email_history',
    description: 'Search sent and received email history (excludes trashed emails) by a keyword matched against subject or customer name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING },
      },
      required: ['query'],
    },
  },

  // ---- New write tools — all safe/non-destructive (create or append only, ----
  // ---- never delete or overwrite existing data). ----
  {
    name: 'add_customer_note',
    description: "Append a note to an existing customer's record (adds to their notes, never overwrites or removes existing notes). Pass the customer's name (partial match ok).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING },
        note: { type: Type.STRING },
      },
      required: ['customer_name', 'note'],
    },
  },
  {
    name: 'add_job_note',
    description: 'Append a diagnostic/progress note to an existing job ticket by job_id (adds to its notes, never overwrites or removes existing notes).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_id: { type: Type.INTEGER },
        note: { type: Type.STRING },
      },
      required: ['job_id', 'note'],
    },
  },
  {
    name: 'create_inventory_item',
    description: 'Add a brand-new part/item to shop inventory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        part_number: { type: Type.STRING },
        category: { type: Type.STRING, description: 'one of: brakes, filters, fluids, electrical, engine, parts, other' },
        quantity_on_hand: { type: Type.INTEGER },
        reorder_threshold: { type: Type.INTEGER },
        cost_price: { type: Type.NUMBER },
        sell_price: { type: Type.NUMBER },
        supplier_name: { type: Type.STRING },
        location: { type: Type.STRING },
      },
      required: ['name'],
    },
  },

  // ---- 2026-07-17 upgrade: broader tool coverage across the rest of the ----
  // ---- app. Same rules as above — read tools are unrestricted, write tools ----
  // ---- can create/append/update but never delete. Manual-browsing tools ----
  // ---- (find_vehicle_manual, browse_manual, above) are untouched. ----

  {
    name: 'send_text_message',
    description: "Send a text message via the shop's Twilio number. Provide exactly one of customer_name, private_contact_name, or phone to identify the recipient.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING },
        private_contact_name: { type: Type.STRING },
        phone: { type: Type.STRING },
        body: { type: Type.STRING },
      },
      required: ['body'],
    },
  },
  {
    name: 'search_texts',
    description: 'Search recent text messages (Conversations + Private, excludes Trash) by customer name, private contact name, phone, or message content.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ['query'],
    },
  },
  {
    name: 'list_private_contacts',
    description: 'List or search the Private Contacts rolodex (personal contacts kept separate from Customers) by name.',
    parameters: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING } },
    },
  },
  {
    name: 'add_private_contact',
    description: 'Add a new Private Contact — completely separate from the Customers list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        phone: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ['name', 'phone'],
    },
  },
  {
    name: 'update_job_status',
    description: "Change an existing job's status (e.g. Pending, In Progress, Completed).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_id: { type: Type.INTEGER },
        status: { type: Type.STRING },
      },
      required: ['job_id', 'status'],
    },
  },
  {
    name: 'update_job_details',
    description: "Update fields on an existing job ticket. Only pass the fields you want to change — anything omitted stays as-is.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_id: { type: Type.INTEGER },
        description: { type: Type.STRING },
        estimated_completion: { type: Type.STRING, description: 'YYYY-MM-DD' },
        labor_cost: { type: Type.NUMBER },
        estimated_hours: { type: Type.NUMBER },
        priority: { type: Type.STRING, description: 'e.g. Standard, Rush' },
        mileage_at_intake: { type: Type.INTEGER },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'generate_job_portal_link',
    description: "Generate (or fetch the existing) customer-facing payment portal link for a job, so the customer can pay online.",
    parameters: {
      type: Type.OBJECT,
      properties: { job_id: { type: Type.INTEGER } },
      required: ['job_id'],
    },
  },
  {
    name: 'update_customer_contact_info',
    description: "Correct or update a customer's phone, email, and/or address. Only pass the fields you want to change.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        address: { type: Type.STRING },
      },
      required: ['customer_name'],
    },
  },
  {
    name: 'tag_customer',
    description: 'Apply a tag to a customer (creates the tag first if it does not already exist).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING },
        tag_name: { type: Type.STRING },
      },
      required: ['customer_name', 'tag_name'],
    },
  },
  {
    name: 'list_tags',
    description: 'List every tag the shop has defined.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'update_vehicle_details',
    description: "Update fields on an existing customer's vehicle (e.g. correct mileage, VIN, color, engine, notes). Only pass the fields you want to change.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        vehicle_id: { type: Type.INTEGER },
        current_mileage: { type: Type.INTEGER },
        vin: { type: Type.STRING },
        color: { type: Type.STRING },
        engine: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ['vehicle_id'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: "Change an existing appointment's date, time, duration, and/or notes. Only pass the fields you want to change.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        appointment_id: { type: Type.INTEGER },
        date: { type: Type.STRING, description: 'YYYY-MM-DD' },
        time: { type: Type.STRING, description: 'HH:MM, 24-hour' },
        duration_minutes: { type: Type.INTEGER },
        notes: { type: Type.STRING },
      },
      required: ['appointment_id'],
    },
  },
  {
    name: 'adjust_inventory_stock',
    description: "Adjust an inventory item's quantity on hand up or down by a delta amount, with a logged reason (e.g. 'used on job #42', 'received shipment', 'inventory correction'). Provide item_id or item_name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_id: { type: Type.INTEGER },
        item_name: { type: Type.STRING },
        delta: { type: Type.INTEGER, description: 'Positive to add stock, negative to remove.' },
        reason: { type: Type.STRING },
      },
      required: ['delta', 'reason'],
    },
  },
  {
    name: 'update_inventory_item',
    description: "Update an existing inventory item's price, reorder threshold, location, supplier, category, or part number. Only pass the fields you want to change. Provide item_id or item_name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_id: { type: Type.INTEGER },
        item_name: { type: Type.STRING },
        cost_price: { type: Type.NUMBER },
        sell_price: { type: Type.NUMBER },
        reorder_threshold: { type: Type.INTEGER },
        location: { type: Type.STRING },
        supplier_name: { type: Type.STRING },
        category: { type: Type.STRING },
        part_number: { type: Type.STRING },
      },
    },
  },
  {
    name: 'get_service_history',
    description: "Get a vehicle's separate service history log (distinct from get_vehicle_history's job records) — past service dates, mileage, parts used, cost, and technician.",
    parameters: {
      type: Type.OBJECT,
      properties: { vehicle_id: { type: Type.INTEGER } },
      required: ['vehicle_id'],
    },
  },
  {
    name: 'search_receipts',
    description: 'Search scanned supplier receipts/invoices by supplier name and/or date range.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        supplier_name: { type: Type.STRING },
        start_date: { type: Type.STRING, description: 'YYYY-MM-DD' },
        end_date: { type: Type.STRING, description: 'YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'list_segments',
    description: 'List saved customer segments (filtered customer groups used for targeted marketing/automations).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_dashboard_stats',
    description: 'Get a quick shop-wide snapshot: total customers/vehicles, active jobs, jobs completed this month, revenue this month, unpaid jobs, low-stock item count, and appointments in the next 7 days.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

// ---------- Tool implementations (all scoped by userId) — unchanged logic ----------

async function runTool(name, input, userId, authHeader) {
  switch (name) {
    case 'get_customer': {
      const customers = db
        .prepare(`SELECT id, name, phone, email FROM customers WHERE user_id = ? AND name LIKE ?`)
        .all(userId, `%${input.name}%`);
      const withVehicles = customers.map((c) => ({
        ...c,
        vehicles: db
          .prepare(
            `SELECT id, year, make, model, engine, color, current_mileage
             FROM customer_vehicles WHERE user_id = ? AND customer_id = ?`
          )
          .all(userId, c.id),
      }));
      return withVehicles;
    }

    case 'get_vehicle_history': {
      const owned = db
        .prepare(`SELECT id FROM customer_vehicles WHERE user_id = ? AND id = ?`)
        .get(userId, input.vehicle_id);
      if (!owned) return { error: 'Vehicle not found for this account.' };

      return db
        .prepare(
          `SELECT j.id, j.description, j.diagnosis_notes, j.status, j.labor_cost,
                  j.estimated_completion, j.actual_completion, j.created_at,
                  COALESCE((SELECT SUM(quantity * unit_cost) FROM job_parts
                            WHERE job_id = j.id AND user_id = j.user_id), 0) AS parts_total
           FROM jobs j WHERE j.user_id = ? AND j.vehicle_id = ? ORDER BY j.created_at DESC`
        )
        .all(userId, input.vehicle_id);
    }

    case 'search_jobs': {
      let query = `
        SELECT j.id, j.description, j.status, j.labor_cost,
               j.estimated_completion, j.actual_completion, c.name AS customer_name,
               COALESCE((SELECT SUM(quantity * unit_cost) FROM job_parts
                         WHERE job_id = j.id AND user_id = j.user_id), 0) AS parts_total
        FROM jobs j
        JOIN customers c ON c.id = j.customer_id AND c.user_id = j.user_id
        WHERE j.user_id = ?`;
      const params = [userId];
      if (input.status) {
        query += ` AND j.status LIKE ?`;
        params.push(input.status);
      }
      if (input.customer_name) {
        query += ` AND c.name LIKE ?`;
        params.push(`%${input.customer_name}%`);
      }
      query += ` ORDER BY j.created_at DESC LIMIT 20`;
      return db.prepare(query).all(...params);
    }

    case 'get_upcoming_appointments': {
      const days = input.days || 7;
      return db
        .prepare(
          `SELECT a.id, a.title, a.date, a.time, a.duration_minutes, a.notes,
                  c.name AS customer_name
           FROM appointments a
           JOIN customers c ON c.id = a.customer_id AND c.user_id = a.user_id
           WHERE a.user_id = ? AND a.date BETWEEN date('now') AND date('now', '+' || ? || ' days')
           ORDER BY a.date ASC, a.time ASC`
        )
        .all(userId, days);
    }

    case 'get_job_parts': {
      const owned = db.prepare(`SELECT id FROM jobs WHERE user_id = ? AND id = ?`).get(userId, input.job_id);
      if (!owned) return { error: 'Job not found for this account.' };

      return db
        .prepare(
          `SELECT id, part_name, part_number, quantity, unit_cost,
                  (quantity * unit_cost) AS line_total, notes
           FROM job_parts WHERE user_id = ? AND job_id = ?`
        )
        .all(userId, input.job_id);
    }

    case 'find_vehicle_manual': {
      return db
        .prepare(
          `SELECT id, source, make, year, model, engine, uriPath, isComplete
           FROM vehicles WHERE make LIKE ? AND model LIKE ?
           AND (? = '' OR year = ?) LIMIT 10`
        )
        .all(`%${input.make}%`, `%${input.model}%`, input.year || '', input.year || '');
    }

    case 'browse_manual': {
      const port = process.env.PORT || 3000;
      try {
        const pageRes = await fetch(`http://localhost:${port}/api/page?uri=${encodeURIComponent(input.uri)}`, {
          headers: authHeader ? { Authorization: authHeader } : {},
        });
        if (!pageRes.ok) return { error: `Manual fetch failed (status ${pageRes.status})` };
        return await pageRes.json();
      } catch (err) {
        return { error: `Manual fetch failed: ${err.message}` };
      }
    }

    case 'create_customer': {
      const info = db
        .prepare(`INSERT INTO customers (name, phone, email, address, notes, user_id) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(input.name, input.phone || null, input.email || null, input.address || null, input.notes || null, userId);
      return db.prepare(`SELECT * FROM customers WHERE id = ? AND user_id = ?`).get(info.lastInsertRowid, userId);
    }

    case 'create_vehicle': {
      const customers = db
        .prepare(`SELECT id, name FROM customers WHERE user_id = ? AND name LIKE ?`)
        .all(userId, `%${input.customer_name}%`);
      if (customers.length === 0) return { error: `No customer found matching "${input.customer_name}".` };
      if (customers.length > 1) return { ambiguous: true, matches: customers, message: 'Multiple customers matched — ask which one.' };

      const info = db
        .prepare(
          `INSERT INTO customer_vehicles (customer_id, year, make, model, engine, vin, color, current_mileage, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          customers[0].id, input.year, input.make, input.model,
          input.engine || null, input.vin || null, input.color || null,
          input.current_mileage || 0, userId
        );
      return db.prepare(`SELECT * FROM customer_vehicles WHERE id = ? AND user_id = ?`).get(info.lastInsertRowid, userId);
    }

    case 'create_appointment': {
      const customers = db
        .prepare(`SELECT id, name FROM customers WHERE user_id = ? AND name LIKE ?`)
        .all(userId, `%${input.customer_name}%`);
      if (customers.length === 0) return { error: `No customer found matching "${input.customer_name}".` };
      if (customers.length > 1) return { ambiguous: true, matches: customers, message: 'Multiple customers matched — ask which one.' };
      const customerId = customers[0].id;

      const vehicles = db
        .prepare(
          `SELECT id, year, make, model FROM customer_vehicles
           WHERE user_id = ? AND customer_id = ?
           AND (make LIKE ? OR model LIKE ? OR year LIKE ?)`
        )
        .all(userId, customerId, `%${input.vehicle_description}%`, `%${input.vehicle_description}%`, `%${input.vehicle_description}%`);
      if (vehicles.length === 0) return { error: `No vehicle matching "${input.vehicle_description}" found for this customer.` };
      if (vehicles.length > 1) return { ambiguous: true, matches: vehicles, message: 'Multiple vehicles matched — ask which one.' };

      const info = db
        .prepare(
          `INSERT INTO appointments (title, customer_id, vehicle_id, date, time, duration_minutes, notes, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(input.title, customerId, vehicles[0].id, input.date, input.time, input.duration_minutes || 60, input.notes || null, userId);
      return db.prepare(`SELECT * FROM appointments WHERE id = ? AND user_id = ?`).get(info.lastInsertRowid, userId);
    }

    // ---- New read tools (implementations for the declarations added above) ----

    case 'list_vehicles': {
      let query = `
        SELECT cv.id, cv.year, cv.make, cv.model, cv.engine, cv.vin, cv.color, cv.current_mileage,
               c.id AS customer_id, c.name AS customer_name
        FROM customer_vehicles cv
        JOIN customers c ON c.id = cv.customer_id AND c.user_id = cv.user_id
        WHERE cv.user_id = ?`;
      const params = [userId];
      if (input.make) { query += ` AND cv.make LIKE ?`; params.push(`%${input.make}%`); }
      if (input.model) { query += ` AND cv.model LIKE ?`; params.push(`%${input.model}%`); }
      if (input.year) { query += ` AND cv.year LIKE ?`; params.push(`%${input.year}%`); }
      if (input.vin) { query += ` AND cv.vin LIKE ?`; params.push(`%${input.vin}%`); }
      query += ` ORDER BY cv.created_at DESC LIMIT 20`;
      return db.prepare(query).all(...params);
    }

    case 'get_job_details': {
      const job = db
        .prepare(
          `SELECT j.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
                  cv.year AS vehicle_year, cv.make AS vehicle_make, cv.model AS vehicle_model, cv.vin AS vehicle_vin
           FROM jobs j
           LEFT JOIN customers c ON c.id = j.customer_id AND c.user_id = j.user_id
           LEFT JOIN customer_vehicles cv ON cv.id = j.vehicle_id AND cv.user_id = j.user_id
           WHERE j.user_id = ? AND j.id = ?`
        )
        .get(userId, input.job_id);
      if (!job) return { error: 'Job not found for this account.' };
      return job;
    }

    case 'list_inventory': {
      let query = `
        SELECT id, part_number, name, category, quantity_on_hand, reorder_threshold, unit_type,
               cost_price, sell_price, supplier_name, location
        FROM inventory_items WHERE user_id = ?`;
      const params = [userId];
      if (input.name) { query += ` AND name LIKE ?`; params.push(`%${input.name}%`); }
      if (input.category) { query += ` AND category = ?`; params.push(input.category); }
      if (input.low_stock_only) { query += ` AND quantity_on_hand <= reorder_threshold`; }
      query += ` ORDER BY name ASC LIMIT 30`;
      return db.prepare(query).all(...params);
    }

    case 'search_appointments': {
      let query = `
        SELECT a.id, a.title, a.date, a.time, a.duration_minutes, a.notes, c.name AS customer_name
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id AND c.user_id = a.user_id
        WHERE a.user_id = ?`;
      const params = [userId];
      if (input.customer_name) { query += ` AND c.name LIKE ?`; params.push(`%${input.customer_name}%`); }
      if (input.start_date) { query += ` AND a.date >= ?`; params.push(input.start_date); }
      if (input.end_date) { query += ` AND a.date <= ?`; params.push(input.end_date); }
      query += ` ORDER BY a.date ASC, a.time ASC LIMIT 30`;
      return db.prepare(query).all(...params);
    }

    case 'get_shop_settings': {
      const settings = db
        .prepare(
          `SELECT shop_name, shop_address, shop_city, shop_state, shop_phone, tax_rate, default_labor_rate, zip_code
           FROM shop_settings WHERE user_id = ?`
        )
        .get(userId);
      return settings || { message: 'No shop profile configured yet — see Settings → Shop Profile & Billing Preferences.' };
    }

    case 'list_payments': {
      let query = `
        SELECT p.id, p.amount_cents, p.currency, p.status, p.created_at, p.job_id, c.name AS customer_name
        FROM payments p
        LEFT JOIN customers c ON c.id = p.customer_id AND c.user_id = p.user_id
        WHERE p.user_id = ?`;
      const params = [userId];
      if (input.status) { query += ` AND p.status = ?`; params.push(input.status); }
      if (input.start_date) { query += ` AND date(p.created_at) >= ?`; params.push(input.start_date); }
      if (input.end_date) { query += ` AND date(p.created_at) <= ?`; params.push(input.end_date); }
      query += ` ORDER BY p.created_at DESC LIMIT 30`;
      return db.prepare(query).all(...params);
    }

    case 'search_email_history': {
      const q = `%${input.query || ''}%`;
      const sent = db
        .prepare(
          `SELECT 'sent' AS type, e.id, e.subject, e.to_email AS other_party_email, e.sent_at AS date, c.name AS customer_name
           FROM emails_sent e LEFT JOIN customers c ON c.id = e.to_customer_id AND c.user_id = e.user_id
           WHERE e.user_id = ? AND e.deleted_at IS NULL AND (e.subject LIKE ? OR c.name LIKE ?)
           ORDER BY e.sent_at DESC LIMIT 15`
        )
        .all(userId, q, q);
      const received = db
        .prepare(
          `SELECT 'received' AS type, er.id, er.subject, er.from_email AS other_party_email, er.received_at AS date, c.name AS customer_name
           FROM emails_received er LEFT JOIN customers c ON c.id = er.from_customer_id AND c.user_id = er.user_id
           WHERE er.user_id = ? AND er.deleted_at IS NULL AND (er.subject LIKE ? OR c.name LIKE ?)
           ORDER BY er.received_at DESC LIMIT 15`
        )
        .all(userId, q, q);
      return [...sent, ...received].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    // ---- New write tools — safe/non-destructive only: create or append, ----
    // ---- never delete or overwrite existing data. ----

    case 'add_customer_note': {
      const customers = db
        .prepare(`SELECT id, name, notes FROM customers WHERE user_id = ? AND name LIKE ?`)
        .all(userId, `%${input.customer_name}%`);
      if (customers.length === 0) return { error: `No customer found matching "${input.customer_name}".` };
      if (customers.length > 1) {
        return { ambiguous: true, matches: customers.map((c) => ({ id: c.id, name: c.name })), message: 'Multiple customers matched — ask which one.' };
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const updatedNotes = customers[0].notes ? `${customers[0].notes}\n[${stamp}] ${input.note}` : `[${stamp}] ${input.note}`;
      db.prepare(`UPDATE customers SET notes = ? WHERE id = ? AND user_id = ?`).run(updatedNotes, customers[0].id, userId);
      return db.prepare(`SELECT id, name, notes FROM customers WHERE id = ? AND user_id = ?`).get(customers[0].id, userId);
    }

    case 'add_job_note': {
      const job = db.prepare(`SELECT id, diagnosis_notes FROM jobs WHERE user_id = ? AND id = ?`).get(userId, input.job_id);
      if (!job) return { error: 'Job not found for this account.' };
      const stamp = new Date().toISOString().slice(0, 10);
      const updatedNotes = job.diagnosis_notes ? `${job.diagnosis_notes}\n[${stamp}] ${input.note}` : `[${stamp}] ${input.note}`;
      db.prepare(`UPDATE jobs SET diagnosis_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(updatedNotes, job.id, userId);
      return db.prepare(`SELECT id, description, diagnosis_notes FROM jobs WHERE id = ? AND user_id = ?`).get(job.id, userId);
    }

    case 'create_inventory_item': {
      const info = db
        .prepare(
          `INSERT INTO inventory_items (part_number, name, category, quantity_on_hand, reorder_threshold, cost_price, sell_price, supplier_name, location, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.part_number || null, input.name, input.category || 'other',
          input.quantity_on_hand || 0, input.reorder_threshold || 0,
          input.cost_price || 0, input.sell_price || 0,
          input.supplier_name || null, input.location || null, userId
        );
      return db.prepare(`SELECT * FROM inventory_items WHERE id = ? AND user_id = ?`).get(info.lastInsertRowid, userId);
    }

    // ---- 2026-07-17 upgrade: new tool implementations. Same rules as the ----
    // ---- existing write tools above — every query scoped to userId, and ----
    // ---- nothing here can delete a record. ----

    case 'send_text_message': {
      const { sendSms } = require('./sms');
      let toPhone = input.phone || null;
      let customerId = null;
      let privateContactId = null;

      if (!toPhone && input.customer_name) {
        const matches = db.prepare(`SELECT id, name, phone FROM customers WHERE user_id = ? AND name LIKE ?`).all(userId, `%${input.customer_name}%`);
        if (matches.length === 0) return { error: `No customer found matching "${input.customer_name}".` };
        if (matches.length > 1) return { ambiguous: true, matches, message: 'Multiple customers matched — ask which one.' };
        if (!matches[0].phone) return { error: `${matches[0].name} has no phone number on file.` };
        toPhone = matches[0].phone;
        customerId = matches[0].id;
      }

      if (!toPhone && input.private_contact_name) {
        const matches = db.prepare(`SELECT id, name, phone FROM private_contacts WHERE user_id = ? AND name LIKE ?`).all(userId, `%${input.private_contact_name}%`);
        if (matches.length === 0) return { error: `No private contact found matching "${input.private_contact_name}".` };
        if (matches.length > 1) return { ambiguous: true, matches, message: 'Multiple private contacts matched — ask which one.' };
        toPhone = matches[0].phone;
        privateContactId = matches[0].id;
      }

      if (!toPhone) return { error: 'Provide a customer_name, private_contact_name, or a raw phone number to text.' };

      try {
        await sendSms({ to: toPhone, body: input.body }, { userId, customerId, triggerType: 'manual' });
      } catch (smsErr) {
        return { error: smsErr.message || 'Failed to send text — Twilio may not be configured yet.' };
      }
      if (privateContactId) {
        db.prepare(`
          UPDATE sms_messages SET private_contact_id = ?
          WHERE id = (SELECT id FROM sms_messages WHERE user_id = ? AND phone = ? ORDER BY id DESC LIMIT 1)
        `).run(privateContactId, userId, toPhone);
      }
      return { success: true, to: toPhone };
    }

    case 'search_texts': {
      const q = `%${input.query || ''}%`;
      return db.prepare(`
        SELECT m.id, m.phone, m.body, m.direction, m.status, m.created_at,
               c.name AS customer_name, pc.name AS private_contact_name
        FROM sms_messages m
        LEFT JOIN customers c ON m.customer_id = c.id
        LEFT JOIN private_contacts pc ON m.private_contact_id = pc.id
        WHERE m.user_id = ? AND m.deleted_at IS NULL
          AND (c.name LIKE ? OR pc.name LIKE ? OR m.phone LIKE ? OR m.body LIKE ?)
        ORDER BY m.created_at DESC LIMIT 20
      `).all(userId, q, q, q, q);
    }

    case 'list_private_contacts': {
      let query = `SELECT id, name, phone, notes FROM private_contacts WHERE user_id = ?`;
      const params = [userId];
      if (input.name) { query += ` AND name LIKE ?`; params.push(`%${input.name}%`); }
      query += ` ORDER BY name ASC LIMIT 30`;
      return db.prepare(query).all(...params);
    }

    case 'add_private_contact': {
      const info = db.prepare(`INSERT INTO private_contacts (user_id, name, phone, notes) VALUES (?, ?, ?, ?)`)
        .run(userId, input.name, input.phone, input.notes || null);
      return db.prepare(`SELECT * FROM private_contacts WHERE id = ?`).get(info.lastInsertRowid);
    }

    case 'update_job_status': {
      const job = db.prepare(`SELECT id FROM jobs WHERE user_id = ? AND id = ?`).get(userId, input.job_id);
      if (!job) return { error: 'Job not found for this account.' };
      db.prepare(`UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(input.status, input.job_id, userId);
      return db.prepare(`SELECT id, description, status FROM jobs WHERE id = ? AND user_id = ?`).get(input.job_id, userId);
    }

    case 'update_job_details': {
      const job = db.prepare(`SELECT id FROM jobs WHERE user_id = ? AND id = ?`).get(userId, input.job_id);
      if (!job) return { error: 'Job not found for this account.' };
      const fields = ['description', 'estimated_completion', 'labor_cost', 'estimated_hours', 'priority', 'mileage_at_intake'];
      const sets = [];
      const params = [];
      for (const f of fields) {
        if (input[f] !== undefined) { sets.push(`${f} = ?`); params.push(input[f]); }
      }
      if (sets.length === 0) return { error: 'No fields provided to update.' };
      params.push(input.job_id, userId);
      db.prepare(`UPDATE jobs SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(...params);
      return db.prepare(`SELECT * FROM jobs WHERE id = ? AND user_id = ?`).get(input.job_id, userId);
    }

    case 'generate_job_portal_link': {
      const job = db.prepare(`SELECT id, portal_token FROM jobs WHERE id = ? AND user_id = ?`).get(input.job_id, userId);
      if (!job) return { error: 'Job not found for this account.' };
      let token = job.portal_token;
      if (!token) {
        token = require('crypto').randomUUID();
        db.prepare(`UPDATE jobs SET portal_token = ?, portal_token_created_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(token, input.job_id, userId);
      }
      const baseUrl = process.env.APP_BASE_URL || 'https://workshop.homeslab.uk';
      return { portal_url: `${baseUrl.replace(/\/$/, '')}/portal/${token}` };
    }

    case 'update_customer_contact_info': {
      const matches = db.prepare(`SELECT id, name FROM customers WHERE user_id = ? AND name LIKE ?`).all(userId, `%${input.customer_name}%`);
      if (matches.length === 0) return { error: `No customer found matching "${input.customer_name}".` };
      if (matches.length > 1) return { ambiguous: true, matches, message: 'Multiple customers matched — ask which one.' };
      const fields = ['phone', 'email', 'address'];
      const sets = [];
      const params = [];
      for (const f of fields) {
        if (input[f] !== undefined) { sets.push(`${f} = ?`); params.push(input[f]); }
      }
      if (sets.length === 0) return { error: 'Provide at least one of phone, email, or address to update.' };
      params.push(matches[0].id, userId);
      db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
      return db.prepare(`SELECT id, name, phone, email, address FROM customers WHERE id = ? AND user_id = ?`).get(matches[0].id, userId);
    }

    case 'tag_customer': {
      const matches = db.prepare(`SELECT id, name FROM customers WHERE user_id = ? AND name LIKE ?`).all(userId, `%${input.customer_name}%`);
      if (matches.length === 0) return { error: `No customer found matching "${input.customer_name}".` };
      if (matches.length > 1) return { ambiguous: true, matches, message: 'Multiple customers matched — ask which one.' };
      let tag = db.prepare(`SELECT id, name FROM tags WHERE user_id = ? AND name = ?`).get(userId, input.tag_name);
      if (!tag) {
        const info = db.prepare(`INSERT INTO tags (user_id, name) VALUES (?, ?)`).run(userId, input.tag_name);
        tag = { id: info.lastInsertRowid, name: input.tag_name };
      }
      db.prepare(`INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?, ?)`).run(matches[0].id, tag.id);
      return { success: true, customer: matches[0].name, tag: tag.name };
    }

    case 'list_tags': {
      return db.prepare(`SELECT id, name, color FROM tags WHERE user_id = ? ORDER BY name ASC`).all(userId);
    }

    case 'update_vehicle_details': {
      const vehicle = db.prepare(`SELECT id FROM customer_vehicles WHERE user_id = ? AND id = ?`).get(userId, input.vehicle_id);
      if (!vehicle) return { error: 'Vehicle not found for this account.' };
      const fields = ['current_mileage', 'vin', 'color', 'engine', 'notes'];
      const sets = [];
      const params = [];
      for (const f of fields) {
        if (input[f] !== undefined) { sets.push(`${f} = ?`); params.push(input[f]); }
      }
      if (sets.length === 0) return { error: 'No fields provided to update.' };
      params.push(input.vehicle_id, userId);
      db.prepare(`UPDATE customer_vehicles SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
      return db.prepare(`SELECT * FROM customer_vehicles WHERE id = ? AND user_id = ?`).get(input.vehicle_id, userId);
    }

    case 'reschedule_appointment': {
      const appt = db.prepare(`SELECT id FROM appointments WHERE user_id = ? AND id = ?`).get(userId, input.appointment_id);
      if (!appt) return { error: 'Appointment not found for this account.' };
      const fields = ['date', 'time', 'notes', 'duration_minutes'];
      const sets = [];
      const params = [];
      for (const f of fields) {
        if (input[f] !== undefined) { sets.push(`${f} = ?`); params.push(input[f]); }
      }
      if (sets.length === 0) return { error: 'Provide at least a new date, time, duration, or notes.' };
      params.push(input.appointment_id, userId);
      db.prepare(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
      return db.prepare(`SELECT * FROM appointments WHERE id = ? AND user_id = ?`).get(input.appointment_id, userId);
    }

    case 'adjust_inventory_stock': {
      let item = null;
      if (input.item_id) {
        item = db.prepare(`SELECT id, name, quantity_on_hand FROM inventory_items WHERE user_id = ? AND id = ?`).get(userId, input.item_id);
      } else if (input.item_name) {
        const matches = db.prepare(`SELECT id, name, quantity_on_hand FROM inventory_items WHERE user_id = ? AND name LIKE ?`).all(userId, `%${input.item_name}%`);
        if (matches.length === 0) return { error: `No inventory item found matching "${input.item_name}".` };
        if (matches.length > 1) return { ambiguous: true, matches, message: 'Multiple items matched — ask which one.' };
        item = matches[0];
      }
      if (!item) return { error: 'Provide item_id or item_name.' };
      db.prepare(`INSERT INTO inventory_adjustments (item_id, delta, reason, user_id) VALUES (?, ?, ?, ?)`).run(item.id, input.delta, input.reason, userId);
      db.prepare(`UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(input.delta, item.id, userId);
      return db.prepare(`SELECT * FROM inventory_items WHERE id = ? AND user_id = ?`).get(item.id, userId);
    }

    case 'update_inventory_item': {
      let item = null;
      if (input.item_id) {
        item = db.prepare(`SELECT id FROM inventory_items WHERE user_id = ? AND id = ?`).get(userId, input.item_id);
      } else if (input.item_name) {
        const matches = db.prepare(`SELECT id, name FROM inventory_items WHERE user_id = ? AND name LIKE ?`).all(userId, `%${input.item_name}%`);
        if (matches.length === 0) return { error: `No inventory item found matching "${input.item_name}".` };
        if (matches.length > 1) return { ambiguous: true, matches, message: 'Multiple items matched — ask which one.' };
        item = matches[0];
      }
      if (!item) return { error: 'Provide item_id or item_name.' };
      const fields = ['cost_price', 'sell_price', 'reorder_threshold', 'location', 'supplier_name', 'category', 'part_number'];
      const sets = [];
      const params = [];
      for (const f of fields) {
        if (input[f] !== undefined) { sets.push(`${f} = ?`); params.push(input[f]); }
      }
      if (sets.length === 0) return { error: 'No fields provided to update.' };
      params.push(item.id, userId);
      db.prepare(`UPDATE inventory_items SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(...params);
      return db.prepare(`SELECT * FROM inventory_items WHERE id = ? AND user_id = ?`).get(item.id, userId);
    }

    case 'get_service_history': {
      const owned = db.prepare(`SELECT id FROM customer_vehicles WHERE user_id = ? AND id = ?`).get(userId, input.vehicle_id);
      if (!owned) return { error: 'Vehicle not found for this account.' };
      return db.prepare(`
        SELECT id, date, mileage, description, parts_used, cost, technician, notes
        FROM service_history WHERE user_id = ? AND vehicle_id = ? ORDER BY date DESC
      `).all(userId, input.vehicle_id);
    }

    case 'search_receipts': {
      let query = `SELECT id, supplier_name, invoice_date, linked_import_summary, notes, uploaded_at FROM receipts WHERE user_id = ?`;
      const params = [userId];
      if (input.supplier_name) { query += ` AND supplier_name LIKE ?`; params.push(`%${input.supplier_name}%`); }
      if (input.start_date) { query += ` AND date(invoice_date) >= ?`; params.push(input.start_date); }
      if (input.end_date) { query += ` AND date(invoice_date) <= ?`; params.push(input.end_date); }
      query += ` ORDER BY uploaded_at DESC LIMIT 20`;
      return db.prepare(query).all(...params);
    }

    case 'list_segments': {
      return db.prepare(`SELECT id, name, filters_json, created_at FROM segments WHERE user_id = ? ORDER BY name ASC`).all(userId);
    }

    case 'get_dashboard_stats': {
      const totalCustomers = db.prepare(`SELECT COUNT(*) AS n FROM customers WHERE user_id = ?`).get(userId).n;
      const totalVehicles = db.prepare(`SELECT COUNT(*) AS n FROM customer_vehicles WHERE user_id = ?`).get(userId).n;
      const activeJobs = db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE user_id = ? AND status NOT IN ('Completed', 'Cancelled')`).get(userId).n;
      const completedThisMonth = db.prepare(`
        SELECT COUNT(*) AS n FROM jobs WHERE user_id = ? AND status = 'Completed'
        AND strftime('%Y-%m', actual_completion) = strftime('%Y-%m', 'now')
      `).get(userId).n;
      const revenueThisMonthCents = db.prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) AS n FROM payments
        WHERE user_id = ? AND status = 'succeeded' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `).get(userId).n;
      const unpaidJobs = db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE user_id = ? AND payment_status = 'Unpaid'`).get(userId).n;
      const lowStock = db.prepare(`SELECT COUNT(*) AS n FROM inventory_items WHERE user_id = ? AND quantity_on_hand <= reorder_threshold`).get(userId).n;
      const upcomingAppointments = db.prepare(`
        SELECT COUNT(*) AS n FROM appointments WHERE user_id = ? AND date BETWEEN date('now') AND date('now', '+7 days')
      `).get(userId).n;
      return {
        total_customers: totalCustomers,
        total_vehicles: totalVehicles,
        active_jobs: activeJobs,
        completed_jobs_this_month: completedThisMonth,
        revenue_this_month: `$${(revenueThisMonthCents / 100).toFixed(2)}`,
        unpaid_jobs: unpaidJobs,
        low_stock_items: lowStock,
        appointments_next_7_days: upcomingAppointments,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ---------- Chat endpoint ----------

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const authHeader = req.headers.authorization;
    const { messages } = req.body; // [{ role: 'user'|'assistant', content: string }, ...]

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Convert incoming {role: 'user'|'assistant', content} history into
    // Gemini's {role: 'user'|'model', parts: [{text}]} format.
    let contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    let finalText = '';

    // Computed once per request (not per-turn, since it can't change mid-conversation).
    // The model has no built-in notion of "today," so relative date phrases like
    // "this month" or "next week" can't be turned into concrete YYYY-MM-DD values for
    // tools like list_payments/search_appointments without this anchor.
    const todayStr = new Date().toISOString().slice(0, 10);
    const systemInstructionWithDate = `${SYSTEM_PROMPT}\n\nToday's date is ${todayStr}. When a tool needs an explicit date or date range (e.g. list_payments, search_appointments) and the user gave a relative phrase like "this month," "this week," "today," or "the next 7 days," resolve it into concrete YYYY-MM-DD value(s) yourself using today's date before calling the tool — don't ask the user to supply dates for something they already phrased in plain language, and don't claim you're unable to calculate a total; call the tool with the resolved dates and sum/report what it returns.`;

    for (let turn = 0; turn < 8; turn++) {
      const response = await generateWithRetry({
        contents,
        config: {
          systemInstruction: systemInstructionWithDate,
          tools: [{ functionDeclarations }],
        },
      });

      const calls = response.functionCalls || [];

      if (calls.length === 0) {
        finalText = response.text || '';
        break;
      }

      // Run each requested tool, scoped to this user
      const functionResponseParts = await Promise.all(
        calls.map(async (call) => ({
          functionResponse: {
            name: call.name,
            response: { result: await runTool(call.name, call.args || {}, userId, authHeader) },
          },
        }))
      );

      // Echo the model's turn (including its function call requests) back into
      // history, then supply the results as the next "user" turn.
      contents.push(response.candidates[0].content);
      contents.push({ role: 'user', parts: functionResponseParts });
    }

    res.json({ reply: finalText || "I wasn't able to work that out — try rephrasing?" });
  } catch (err) {
    console.error('Chat error:', err);
    const status = err.status || err.error?.code;
    if (status === 503) {
      return res.json({ reply: "Meow — Google's AI is swamped right now, even after a couple retries. Give it a minute and try again." });
    }
    if (status === 429) {
      return res.json({ reply: "Meow — we've hit today's free usage limit on Gemini (even the backup model). This resets daily, so try again a bit later, or consider enabling billing on your Google AI Studio project for higher limits." });
    }
    res.status(500).json({ error: 'Chat request failed' });
  }
});

module.exports = router;
