// chat-route.js
//
// Cooper & Roscoe shop assistant — Gemini API version. CRM tools (customers,
// jobs, appointments, parts) plus live browsing of the full 304,923-vehicle
// manual library via your existing /api/page route. No baked-in
// system-manual/user-guide docs yet — that's the next layer once this is solid.
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

When creating or booking something, confirm back to the user in plain language
what you did (e.g. "Added a 2019 Toyota Tacoma to John Doe's account" or
"Booked an appointment for Sarah Connor's Caprice on 2026-07-10 at 09:00").
If create_vehicle or create_appointment returns an "ambiguous" result with
multiple matches, list the options clearly and ask the user to pick one
before trying again — never guess which one they meant.

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

    for (let turn = 0; turn < 8; turn++) {
      const response = await generateWithRetry({
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
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
