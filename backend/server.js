/**
 * Workshop: Ragnarök - Homelab Backend Server
 * Auto CRM & Shop Management System Coordinates
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const LEMON_SERVER_URL = process.env.LEMON_SERVER_URL || 'http://lemon-server:8080';
const DB_PATH = process.env.DB_PATH || '/data/db/workshop.db';

// Ensure DB directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Apply auth middleware to all API routes
const { authMiddleware, adminOnly } = require('./middleware/authMiddleware');
app.use('/api', authMiddleware);

// Initialize SQLite database
let db;
try {
  db = new Database(DB_PATH);
  console.log(`Connected to SQLite database at ${DB_PATH}`);
  
  // Ensure the base garage table exists (backwards compatibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS garage (
      garageId INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER,
      nickname TEXT
    )
  `);

  // 1. Create Customers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Create Customer Vehicles Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      year TEXT,
      make TEXT,
      model TEXT,
      engine TEXT,
      vin TEXT,
      color TEXT,
      purchase_date TEXT,
      purchase_mileage INTEGER,
      current_mileage INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Create Service History Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER REFERENCES customer_vehicles(id) ON DELETE CASCADE,
      job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
      date TEXT,
      mileage INTEGER,
      description TEXT,
      parts_used TEXT,
      cost REAL,
      technician TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Create Jobs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      vehicle_id INTEGER REFERENCES customer_vehicles(id) ON DELETE CASCADE,
      description TEXT,
      diagnosis_notes TEXT,
      labor_notes TEXT,
      status TEXT DEFAULT 'Pending',
      estimated_completion TEXT,
      actual_completion TEXT,
      labor_cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Create Job Parts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      part_name TEXT,
      part_number TEXT,
      quantity INTEGER DEFAULT 1,
      unit_cost REAL DEFAULT 0,
      notes TEXT
    )
  `);

  // 6. Create Appointments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      vehicle_id INTEGER REFERENCES customer_vehicles(id) ON DELETE CASCADE,
      date TEXT,
      time TEXT,
      duration_minutes INTEGER DEFAULT 60,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Create Vehicle Manuals Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_manuals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      garage_vehicle_id INTEGER NOT NULL REFERENCES customer_vehicles(id) ON DELETE CASCADE,
      manual_uri TEXT NOT NULL,
      manual_title TEXT,
      manual_make TEXT,
      manual_year TEXT,
      manual_model TEXT,
      manual_engine TEXT,
      saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(garage_vehicle_id, manual_uri)
    )
  `);

  // 8. Create Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_flags (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Seed the admin user if not exists
  const bcrypt = require('bcryptjs');
  const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('usmc6123');
  if (!existingAdmin) {
    const saltRounds = 10;
    const hash = bcrypt.hashSync('GHostrider36', saltRounds);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run('usmc6123', hash, 'admin');
    console.log('Seeded initial admin user: usmc6123');
  }

  // Seed initial CRM data if table is completely empty
  const seeded = db.prepare(
    'SELECT value FROM app_flags WHERE key = ?'
  ).get('initial_seed_done');
  
  if (!seeded) {
    console.log('Seeding initial CRM database rows...');
    
    // Seed Customers
    const customer1 = db.prepare(`INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)`).run(
      'Sarah Connor', '555-0199', 'sconnor@cyberdyne.net', '123 Resistance Way, Los Angeles, CA', 'Loyal client. Prefers telephone check-ins.'
    );
    const customer2 = db.prepare(`INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)`).run(
      'John Doe', '555-4321', 'johndoe@example.com', '456 Main St, Pasadena, CA', 'Monthly regular. Drives Tacoma.'
    );
    const customer3 = db.prepare(`INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)`).run(
      'Miles Dyson', '555-2099', 'mdyson@cyberdyne.net', '789 Cyberdyne Blvd, Sunnyvale, CA', 'Senior Engineer. Corvette collector.'
    );

    // Seed Vehicles
    db.prepare(`INSERT INTO customer_vehicles (customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      customer1.lastInsertRowid, '1991', 'Chevrolet', 'Caprice', '5.0L V8', '1G1BL51E6MR123456', 'Midnight Blue', '1991-05-15', 0, 142000, 'Heavy-duty suspension modifications.'
    );
    db.prepare(`INSERT INTO customer_vehicles (customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      customer2.lastInsertRowid, '2019', 'Toyota', 'Tacoma', '3.5L V6', '5TFDZ5AN4KX987654', 'Cement Gray', '2019-10-10', 12, 68500, 'Routine service schedule.'
    );
    db.prepare(`INSERT INTO customer_vehicles (customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      customer3.lastInsertRowid, '2011', 'Chevrolet', 'Corvette', '6.2L V8 LS3', '1G1YY2DW6B5100000', 'Torch Red', '2015-04-20', 12000, 31000, 'Showroom condition, weekend driver.'
    );

    // Seed Jobs
    const job1 = db.prepare(`INSERT INTO jobs (customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, labor_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      customer1.lastInsertRowid, 1, 'Front suspension rebuild', 'Inspect front end control arms, bushings, and tie rods for heavy wear.', 'Replace upper ball joints and sway bar links. Perform alignment.', 'In Progress', '2026-06-27', 180.00
    );
    const job2 = db.prepare(`INSERT INTO jobs (customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, labor_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      customer2.lastInsertRowid, 2, 'Tire rotation & transmission flush', 'ATF inspection. Check cabin filters.', 'Rotate tires, flush automatic transmission fluid. Replaced cabin filter.', 'Pending', '2026-06-26', 110.00
    );
    const job3 = db.prepare(`INSERT INTO jobs (customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, labor_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      customer3.lastInsertRowid, 3, 'Spark plug tune-up', 'Missfire on cylinder 5 detected.', 'Scan ECU codes. Replace spark plugs on all cylinders.', 'Complete', '2026-06-24', 90.00
    );

    // Seed Job Parts
    db.prepare(`INSERT INTO job_parts (job_id, part_name, part_number, quantity, unit_cost, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      job1.lastInsertRowid, 'Front Upper Ball Joint', 'K772', 2, 34.99, 'Moog Problem Solver'
    );
    db.prepare(`INSERT INTO job_parts (job_id, part_name, part_number, quantity, unit_cost, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      job1.lastInsertRowid, 'Sway Bar Link Kit', 'K8268', 2, 18.50, 'Front L/R Sway Bar'
    );
    db.prepare(`INSERT INTO job_parts (job_id, part_name, part_number, quantity, unit_cost, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      job2.lastInsertRowid, 'Toyota Genuine WS Fluid', '08886-02305', 4, 14.25, 'Transmission Fluid quarts'
    );
    db.prepare(`INSERT INTO job_parts (job_id, part_name, part_number, quantity, unit_cost, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      job3.lastInsertRowid, 'NGK Iridium Spark Plugs', 'TR55IX', 8, 8.99, 'Pre-gapped to 0.040"'
    );

    // Seed Appointments
    db.prepare(`INSERT INTO appointments (title, customer_id, vehicle_id, date, time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'Sarah Connor - Caprice Rebuild Drop-off', customer1.lastInsertRowid, 1, '2026-06-27', '08:30', 60, 'Morning key drop. Requesting loaner car.'
    );
    db.prepare(`INSERT INTO appointments (title, customer_id, vehicle_id, date, time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'John Doe - Tacoma Service Wait', customer2.lastInsertRowid, 2, '2026-06-26', '13:00', 90, 'Wait in customer lounge.'
    );

    // Seed Service History
    db.prepare(`INSERT INTO service_history (vehicle_id, date, mileage, description, parts_used, cost, technician, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      2, '2025-11-10', 58000, 'Engine Oil Service & Filter Replacement', '7qt 0W-20 Full Synth, Oil Filter', 59.99, 'Marcus Vance', 'Oil black but normal. Air filters checked clean.'
    );
    db.prepare(`INSERT INTO service_history (vehicle_id, date, mileage, description, parts_used, cost, technician, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      3, '2026-06-24', 31000, 'Misfire diagnostic spark plug swap', '8x NGK Iridium Plugs', 161.92, 'David Miller', 'Scanned cylinder 5 misfire. Spark plugs swapped, test-drive checked clean.'
    );

    db.prepare(
      'INSERT INTO app_flags (key, value) VALUES (?, ?)'
    ).run('initial_seed_done', 'true');
  }

  console.log('Verified database schemas & seeds.');
} catch (err) {
  console.error('Failed to initialize SQLite database:', err);
}

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare password hash
    const bcrypt = require('bcryptjs');
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'workshop-ragnarok-secret';
    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.get('/api/auth/me', (req, res) => {
  // authMiddleware already verified and populated req.user
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.user });
});

// Admin-only user management routes
app.get('/api/auth/users', adminOnly, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Database error listing users' });
  }
});

app.post('/api/auth/users', adminOnly, (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing username, password, or role' });
    }

    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 10);

    const stmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    const info = stmt.run(username, hash, role);

    res.status(201).json({
      id: info.lastInsertRowid,
      username,
      role
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Database error creating user' });
  }
});

app.delete('/api/auth/users/:id', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves to avoid locking themselves out
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Database error deleting user' });
  }
});

app.patch('/api/auth/users/:id/password', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ error: 'New password is required' });
    }

    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(newPassword, 10);

    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    const info = stmt.run(hash, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Database error changing password' });
  }
});

// Ensure database query safety when tables aren't hydrated yet
function isVehiclesTableReady() {
  if (!db) return false;
  try {
    const test = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='vehicles'").get();
    return test.count > 0;
  } catch {
    return false;
  }
}

// GET /health and /api/health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /api/makes
app.get('/api/makes', (req, res) => {
  try {
    if (!isVehiclesTableReady()) {
      return res.json([]);
    }
    const stmt = db.prepare('SELECT DISTINCT make FROM vehicles ORDER BY make ASC');
    const rows = stmt.all();
    const makes = rows.map(r => r.make).filter(Boolean);
    res.json(makes);
  } catch (error) {
    console.error('Error fetching makes:', error);
    res.status(500).json({ error: 'Database error fetching makes' });
  }
});

// GET /api/years?make=Ford
app.get('/api/years', (req, res) => {
  try {
    const { make } = req.query;
    if (!make) {
      return res.status(400).json({ error: 'Missing make parameter' });
    }
    if (!isVehiclesTableReady()) {
      return res.json([]);
    }
    const stmt = db.prepare('SELECT DISTINCT year FROM vehicles WHERE make = ? ORDER BY year ASC');
    const rows = stmt.all(make);
    const years = rows.map(r => r.year).filter(Boolean);
    res.json(years);
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Database error fetching years' });
  }
});

// GET /api/vehicles?make=Ford&year=2006&q=Explorer&limit=50
app.get('/api/vehicles', (req, res) => {
  try {
    if (!isVehiclesTableReady()) {
      return res.json([]);
    }
    const { make, year, q, limit } = req.query;
    const limitVal = parseInt(limit, 10) || 50;

    let queryStr = 'SELECT * FROM vehicles';
    const conditions = [];
    const params = [];

    if (make) {
      conditions.push('make = ?');
      params.push(make);
    }
    if (year) {
      conditions.push('year = ?');
      params.push(year);
    }
    if (q) {
      const aliases = {
        'chevy': 'chevrolet', 'vw': 'volkswagen', 'benz': 'mercedes',
        'ram': 'dodge', 'dodge': 'dodge and ram', 'merc': 'mercedes'
      };
      const tokens = q.toLowerCase().trim().split(/\s+/).map(t => aliases[t] || t);
      for (const token of tokens) {
        conditions.push('(LOWER(make) LIKE ? OR LOWER(model) LIKE ? OR LOWER(year) LIKE ? OR LOWER(engine) LIKE ?)');
        const p = `%${token}%`;
        params.push(p, p, p, p);
      }
    }

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' LIMIT ?';
    params.push(limitVal);

    const stmt = db.prepare(queryStr);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Database error fetching vehicles' });
  }
});

// GET /api/vehicles/models
// Returns distinct model names for a given make/year with no truncation,
// regardless of how many engine/trans variant rows exist underneath.
app.get('/api/vehicles/models', (req, res) => {
  try {
    if (!isVehiclesTableReady()) {
      return res.json([]);
    }
    const { make, year } = req.query;
    if (!make || !year) {
      return res.status(400).json({ error: 'make and year are required' });
    }
    const stmt = db.prepare('SELECT DISTINCT model FROM vehicles WHERE make = ? AND year = ? ORDER BY model ASC');
    const rows = stmt.all(make, year);
    res.json(rows.map(r => r.model));
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Database error fetching models' });
  }
});

// GET /api/garage
app.get('/api/garage', (req, res) => {
  try {
    if (!isVehiclesTableReady()) {
      return res.json([]);
    }
    const stmt = db.prepare(`
      SELECT g.garageId, g.nickname, v.id, v.source, v.make, v.year, v.model, v.engine, v.uriPath, v.isComplete
      FROM garage g
      JOIN vehicles v ON g.vehicleId = v.id
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching garage:', error);
    res.status(500).json({ error: 'Database error fetching garage' });
  }
});

// POST /api/garage
app.post('/api/garage', (req, res) => {
  try {
    const { vehicleId, nickname } = req.body;
    if (!vehicleId) {
      return res.status(400).json({ error: 'Missing vehicleId' });
    }
    if (!isVehiclesTableReady()) {
      return res.status(400).json({ error: 'Vehicles index database is not hydrated yet' });
    }

    // Confirm vehicle existence
    const vehicleExists = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(vehicleId);
    if (!vehicleExists) {
      return res.status(404).json({ error: 'Vehicle profile not found' });
    }

    const stmt = db.prepare('INSERT INTO garage (vehicleId, nickname) VALUES (?, ?)');
    const info = stmt.run(vehicleId, nickname || null);
    const garageId = info.lastInsertRowid;

    // Join and fetch the newly inserted garage profile
    const item = db.prepare(`
      SELECT g.garageId, g.nickname, v.id, v.source, v.make, v.year, v.model, v.engine, v.uriPath, v.isComplete
      FROM garage g
      JOIN vehicles v ON g.vehicleId = v.id
      WHERE g.garageId = ?
    `).get(garageId);

    res.json(item);
  } catch (error) {
    console.error('Error adding to garage:', error);
    res.status(500).json({ error: 'Database error adding to garage' });
  }
});

// DELETE /api/garage/:garageId
app.delete('/api/garage/:garageId', (req, res) => {
  try {
    const { garageId } = req.params;
    const stmt = db.prepare('DELETE FROM garage WHERE garageId = ?');
    const info = stmt.run(garageId);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Garage entry not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing from garage:', error);
    res.status(500).json({ error: 'Database error removing from garage' });
  }
});

// GET /api/page?uri=<uriPath>
app.get('/api/page', async (req, res) => {
  try {
    const { uri } = req.query;
    if (!uri) {
      return res.status(400).json({ error: 'Missing uri parameter' });
    }

    const targetUrl = `${LEMON_SERVER_URL}${uri}`;
    console.log(`Fetching from lemon-server: ${targetUrl}`);

    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`lemon-server responded with status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Target div.main, fallback to body
    let $content = $('div.main');
    if ($content.length === 0) {
      $content = $('body');
    }

    // Extract title
    let title = $content.find('h1').first().text().trim();
    if (!title) {
      title = $('title').text().trim() || 'Service Manual Page';
    }

    // Category vs Content page detection
    // Better detection: LEMON content pages have a specific ID wrapper or ARABICNUM lists
    const isLemonContent = $content.find('div[id^="S"]').length > 0 || 
                           $content.find('ol.ARABICNUM').length > 0 ||
                           $content.find('a[href^="/hyperlink/"]').length > 0;

    const isCharmContent = !isLemonContent && (
                           $content.find('div.oxe-image, div.big-img').length > 0 ||
                           ($content.find('b').length > 0 && 
                            $content.find('ul li a, ol li a').length === 0));

    // Category pages: have nav links pointing to other manual pages, no content markers
    const categoryLinks = $content.find('ul li a, ol li a').filter((i, el) => {
      const href = $(el).attr('href') || '';
      return !href.startsWith('#') && !href.startsWith('http') && href.length > 0;
    });
    const hasCategoryLinks = categoryLinks.length > 0 && !isLemonContent && !isCharmContent;

    if (hasCategoryLinks) {
      const tree = [];

      $content.find('ul, ol').each((idx, listEl) => {
        const $list = $(listEl);
        
        // Find preceding heading if present (up to 3 tags backward)
        let headingText = '';
        let prev = $list.prev();
        for (let i = 0; i < 3 && prev.length > 0; i++) {
          const tagName = prev[0].name ? prev[0].name.toLowerCase() : '';
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            headingText = prev.text().trim();
            break;
          }
          prev = prev.prev();
        }

        const children = [];
        $list.find('li').each((i, liEl) => {
          const $li = $(liEl);
          const $a = $li.find('a').first();
          if ($a.length > 0) {
            const linkTitle = $a.text().trim();
            const href = $a.attr('href') || '';
            const isDownload = href.startsWith('/bundle/') || href.endsWith('.zip');
            children.push({
              type: 'link',
              title: linkTitle,
              icon: isDownload ? '/icons/download.svg' : '/icons/service-and-repair.svg',
              href: href
            });
          }
        });

        if (children.length > 0) {
          if (headingText) {
            tree.push({
              type: 'category',
              title: headingText,
              icon: '/icons/service-and-repair.svg',
              children: children
            });
          } else {
            tree.push(...children);
          }
        }
      });

      return res.json({
        pageType: 'category',
        title: title,
        tree: tree
      });
    } else {
      const blocks = [];
      let pageType = 'unknown';

      if (isLemonContent) {
        pageType = 'content';
        // --- LEMON Content Parser ---
        const mainDiv = $content.find('div.main');
        const targetEl = mainDiv.length > 0 ? mainDiv : $content;
        
        let currentParts = [];
        
        const flushParts = () => {
          if (currentParts.length === 0) return;
          if (currentParts.length === 1 && currentParts[0].type === 'text') {
            blocks.push({ type: 'paragraph', text: currentParts[0].text });
          } else {
            blocks.push({ type: 'paragraph', parts: currentParts });
          }
          currentParts = [];
        };
        
        targetEl.contents().each((idx, node) => {
          const $node = $(node);
          const tagName = node.name ? node.name.toLowerCase() : '';
          
          if (node.type === 'text') {
            const text = node.data ? node.data.trim() : '';
            if (text) currentParts.push({ type: 'text', text });
          } else if (tagName === 'br') {
            flushParts();
          } else if (tagName === 'a') {
            const linkText = $node.text().trim();
            let href = $node.attr('href') || '';
            if (href.startsWith('/hyperlink/')) href = href.substring(11);
            else if (href.startsWith('hyperlink/')) href = href.substring(10);
            if (!href.startsWith('/')) href = '/' + href;
            if (linkText) currentParts.push({ type: 'internalLink', text: linkText, href });
          } else if (tagName === 'h1' || tagName === 'h2') {
            flushParts();
            const text = $node.text().trim();
            if (text) blocks.push({ type: 'heading', text });
          } else if (tagName === 'b') {
            flushParts();
            const text = $node.text().trim();
            if (text) blocks.push({ type: 'heading', text });
          } else if (tagName === 'img') {
            flushParts();
            const src = $node.attr('src');
            if (src) blocks.push({ type: 'image', src });
          } else if (tagName === 'span') {
            $node.contents().each((i, child) => {
              const $child = $(child);
              const childTag = child.name ? child.name.toLowerCase() : '';
              if (child.type === 'text') {
                const text = child.data ? child.data.trim() : '';
                if (text) currentParts.push({ type: 'text', text });
              } else if (childTag === 'a') {
                const linkText = $child.text().trim();
                let href = $child.attr('href') || '';
                if (href.startsWith('/hyperlink/')) href = href.substring(11);
                else if (href.startsWith('hyperlink/')) href = href.substring(10);
                if (!href.startsWith('/')) href = '/' + href;
                if (linkText) currentParts.push({ type: 'internalLink', text: linkText, href });
              }
            });
          } else if (tagName === 'div') {
            flushParts();
            // Recursively process children of wrapper divs (like div[id^="S"])
            $node.contents().each((dIdx, dNode) => {
              const $dNode = $(dNode);
              const dTagName = dNode.name ? dNode.name.toLowerCase() : '';
              
              if (dNode.type === 'text') {
                const text = dNode.data ? dNode.data.trim() : '';
                if (text) currentParts.push({ type: 'text', text });
              } else if (dTagName === 'br') {
                flushParts();
              } else if (dTagName === 'a') {
                const linkText = $dNode.text().trim();
                let href = $dNode.attr('href') || '';
                if (href.startsWith('/hyperlink/')) href = href.substring(11);
                else if (href.startsWith('hyperlink/')) href = href.substring(10);
                if (!href.startsWith('/')) href = '/' + href;
                if (linkText) currentParts.push({ type: 'internalLink', text: linkText, href });
              } else if (dTagName === 'h1' || dTagName === 'h2' || dTagName === 'b') {
                flushParts();
                const text = $dNode.text().trim();
                if (text) blocks.push({ type: 'heading', text });
              } else if (dTagName === 'img') {
                flushParts();
                const src = $dNode.attr('src');
                if (src) blocks.push({ type: 'image', src });
              } else if (dTagName === 'table') {
                flushParts();
                const tableData = [];
                $dNode.find('tr').each((i, row) => {
                  const rowData = [];
                  $(row).find('td, th').each((j, cell) => {
                    const $cell = $(cell);
                    const cellLinks = [];
                    $cell.find('a').each((k, link) => {
                      const $link = $(link);
                      let href = $link.attr('href') || '';
                      if (href.startsWith('/hyperlink/')) href = href.substring(11);
                      else if (href.startsWith('hyperlink/')) href = href.substring(10);
                      if (!href.startsWith('/')) href = '/' + href;
                      cellLinks.push({ text: $link.text().trim(), href });
                    });
                    rowData.push({ 
                      text: $cell.text().trim(),
                      isHeader: cell.name.toLowerCase() === 'th',
                      links: cellLinks
                    });
                  });
                  if (rowData.length > 0) tableData.push(rowData);
                });
                if (tableData.length > 0) {
                  blocks.push({ type: 'table', rows: tableData });
                }
              } else if (dTagName === 'div') {
                // handle nested divs with class clsTableTitle etc as headings
                const text = $dNode.text().trim();
                if (text) {
                  flushParts();
                  blocks.push({ type: 'heading', text });
                }
              }
            });
          } else if (tagName === 'table') {
            flushParts();
            const tableData = [];
            $node.find('tr').each((i, row) => {
              const rowData = [];
              $(row).find('td, th').each((j, cell) => {
                const $cell = $(cell);
                const cellLinks = [];
                $cell.find('a').each((k, link) => {
                  const $link = $(link);
                  let href = $link.attr('href') || '';
                  if (href.startsWith('/hyperlink/')) href = href.substring(11);
                  else if (href.startsWith('hyperlink/')) href = href.substring(10);
                  if (!href.startsWith('/')) href = '/' + href;
                  cellLinks.push({ text: $link.text().trim(), href });
                });
                rowData.push({ 
                  text: $cell.text().trim(),
                  isHeader: cell.name.toLowerCase() === 'th',
                  links: cellLinks
                });
              });
              if (rowData.length > 0) tableData.push(rowData);
            });
            if (tableData.length > 0) {
              blocks.push({ type: 'table', rows: tableData });
            }
          }
        });
        
        flushParts();
      } else if (isCharmContent) {
        pageType = 'content';
        // --- CHARM Content Parser ---
        let currentSteps = [];
        const childNodes = $content.contents();

        childNodes.each((idx, node) => {
          const $node = $(node);
          
          if (node.type === 'text') {
            const text = node.data.trim();
            if (text) {
              if (currentSteps.length > 0) {
                blocks.push({ type: 'steps', items: currentSteps });
                currentSteps = [];
              }
              blocks.push({ type: 'text', text });
            }
          } else {
            const tagName = node.name ? node.name.toLowerCase() : '';
            
            if (tagName === 'br') {
              return;
            }
            
            if (['h1', 'h2', 'h3', 'h4', 'b'].includes(tagName)) {
              if (currentSteps.length > 0) {
                blocks.push({ type: 'steps', items: currentSteps });
                currentSteps = [];
              }
              const text = $node.text().trim();
              if (text) {
                blocks.push({ type: 'heading', text });
              }
            } else if (tagName === 'div' && ($node.hasClass('oxe-image') || $node.hasClass('big-img'))) {
              if (currentSteps.length > 0) {
                blocks.push({ type: 'steps', items: currentSteps });
                currentSteps = [];
              }
              const img = $node.find('img');
              const src = img.attr('src');
              if (src) {
                blocks.push({ type: 'image', src });
              }
            } else if (tagName === 'img') {
              if (currentSteps.length > 0) {
                blocks.push({ type: 'steps', items: currentSteps });
                currentSteps = [];
              }
              const src = $node.attr('src');
              if (src) {
                blocks.push({ type: 'image', src });
              }
            } else if (tagName === 'span' && $node.hasClass('indent-2')) {
              let stepText = '';
              let next = node.nextSibling;
              while (next && next.type === 'text' && !next.data.trim()) {
                next = next.nextSibling;
              }
              if (next && next.name === 'span' && $(next).hasClass('indent-5')) {
                stepText = $(next).text().trim();
              } else if (next) {
                stepText = $(next).text().trim();
              }
              
              if (stepText) {
                currentSteps.push(stepText);
              }
            } else if (tagName === 'span' && $node.hasClass('indent-5')) {
              return;
            } else {
              const hasImgOrHeader = $node.find('img, h1, h2, h3, h4, b, div.oxe-image').length > 0;
              if (!hasImgOrHeader) {
                const text = $node.text().trim();
                if ($node.hasClass('indent-right-align')) {
                  return;
                }
                if (text) {
                  if (currentSteps.length > 0) {
                    blocks.push({ type: 'steps', items: currentSteps });
                    currentSteps = [];
                  }
                  blocks.push({ type: 'text', text });
                }
              }
            }
          }
        });

        if (currentSteps.length > 0) {
          blocks.push({ type: 'steps', items: currentSteps });
        }
      }

      if (pageType === 'unknown' && $content.length > 0) {
        // Fallback parser for generic LEMON page
        let currentParts = [];

        const flushCurrentParts = () => {
          if (currentParts.length > 0) {
            // Simplify if only one part of type 'text'
            if (currentParts.length === 1 && currentParts[0].type === 'text') {
              blocks.push({ type: 'paragraph', text: currentParts[0].text });
            } else {
              blocks.push({ type: 'paragraph', parts: currentParts });
            }
            currentParts = [];
          }
        };

        const processInlineNode = (node, partsList) => {
          const $node = $(node);
          const tagName = node.name ? node.name.toLowerCase() : '';

          if (node.type === 'text') {
            const text = node.data;
            if (text && text.trim()) {
              partsList.push({ type: 'text', text: text.replace(/\s+/g, ' ') });
            }
          } else if (tagName === 'a') {
            const linkText = $node.text().trim();
            let href = $node.attr('href') || '';
            if (href.startsWith('/hyperlink/')) {
              href = href.substring(11);
            } else if (href.startsWith('hyperlink/')) {
              href = href.substring(10);
            }
            if (!href.startsWith('/')) {
              href = '/' + href;
            }
            if (linkText) {
              partsList.push({ type: 'internalLink', text: linkText, href });
            }
          } else if (tagName === 'span') {
            const text = $node.text();
            const trimmed = text.trim();
            const match = trimmed.match(/^(\d+)\.\s*(.*)$/);
            if (!match && trimmed && !/^\s*$/.test(text)) {
              partsList.push({ type: 'text', text: text.replace(/\s+/g, ' ') });
            }
          }
        };

        const childNodes = $content.contents();
        childNodes.each((idx, node) => {
          const $node = $(node);
          const tagName = node.name ? node.name.toLowerCase() : '';

          let isStepSpan = false;
          if (tagName === 'span') {
            const trimmed = $node.text().trim();
            if (trimmed.match(/^(\d+)\.\s*(.*)$/)) {
              isStepSpan = true;
            }
          }

          if (tagName === 'h1' || tagName === 'b') {
            flushCurrentParts();
            const text = $node.text().trim();
            if (text) {
              blocks.push({ type: 'heading', text });
            }
          } else if (tagName === 'br') {
            flushCurrentParts();
          } else if (isStepSpan) {
            flushCurrentParts();
            const trimmed = $node.text().trim();
            const match = trimmed.match(/^(\d+)\.\s*(.*)$/);
            const N = parseInt(match[1], 10);
            const stepText = match[2].trim();
            blocks.push({ type: 'step', number: N, text: stepText });
          } else if (tagName === 'p') {
            flushCurrentParts();
            const pParts = [];
            $node.contents().each((pIdx, pNode) => {
              processInlineNode(pNode, pParts);
            });
            if (pParts.length > 0) {
              if (pParts.length === 1 && pParts[0].type === 'text') {
                blocks.push({ type: 'paragraph', text: pParts[0].text });
              } else {
                blocks.push({ type: 'paragraph', parts: pParts });
              }
            }
          } else {
            processInlineNode(node, currentParts);
          }
        });

        flushCurrentParts();

        if (blocks.length > 0) {
          pageType = 'lemon';
        }
      }

      // Fallback text if empty
      if (blocks.length === 0) {
        const text = $content.text().trim();
        if (text) {
          blocks.push({ type: 'text', text });
        }
      }

      console.log('[PAGE DEBUG] pageType:', pageType, '| blocks count:', blocks.length);
      const linkBlocks = blocks.filter(b => 
        b.type === 'internalLink' || 
        (b.parts && b.parts.some(p => p.type === 'internalLink'))
      );
      console.log('[LINK BLOCKS]', JSON.stringify(linkBlocks));
      console.log('[ALL BLOCKS]', JSON.stringify(blocks));

      return res.json({
        pageType: pageType === 'unknown' ? 'content' : pageType,
        title: title,
        blocks: blocks
      });
    }

  } catch (error) {
    console.error('Error serving manual page:', error.message);
    res.status(500).json({
      pageType: 'unknown',
      title: 'Failed to Parse Page',
      blocks: []
    });
  }
});

// GET /api/image?src=/some/image/path.png
app.get('/api/image', async (req, res) => {
  try {
    const { src } = req.query;
    if (!src) {
      return res.status(400).send('Missing src query parameter');
    }

    const targetUrl = `${LEMON_SERVER_URL}${src}`;
    console.log(`Proxying image: ${targetUrl}`);

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch remote image');
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).send('Error proxying image');
  }
});

// ==========================================
// AUTO SHOP MANAGEMENT SYSTEM CRM API ENDPOINTS
// ==========================================

// --- DATABASE STATS ---
app.get('/api/stats', (req, res) => {
  try {
    let totalManuals = 300000;
    if (isVehiclesTableReady()) {
      const row = db.prepare('SELECT count(*) as count FROM vehicles').get();
      totalManuals = row.count || 300000;
    }
    
    const customersCount = db.prepare('SELECT count(*) as count FROM customers').get().count || 0;
    const vehiclesCount = db.prepare('SELECT count(*) as count FROM customer_vehicles').get().count || 0;
    const activeJobsCount = db.prepare("SELECT count(*) as count FROM jobs WHERE status != 'Complete' AND status != 'Cancelled'").get().count || 0;

    res.json({
      totalManuals,
      totalCustomers: customersCount,
      totalVehicles: vehiclesCount,
      activeJobs: activeJobsCount
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Database error fetching stats' });
  }
});

// --- CUSTOMERS ---
app.get('/api/customers', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT c.*, 
        (SELECT count(*) FROM customer_vehicles WHERE customer_id = c.id) as vehicle_count,
        (SELECT MAX(date) FROM service_history sh JOIN customer_vehicles cv ON sh.vehicle_id = cv.id WHERE cv.customer_id = c.id) as last_visit
      FROM customers c 
      ORDER BY c.name ASC
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Database error fetching customers' });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const stmt = db.prepare('INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(name, phone, email, address, notes);
    const inserted = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Database error creating customer' });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, notes } = req.body;
    const stmt = db.prepare('UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?');
    const info = stmt.run(name, phone, email, address, notes, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Database error updating customer' });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    // SQLite foreign keys ON DELETE CASCADE will handle cascading where specified, but let's be thorough
    db.prepare('DELETE FROM appointments WHERE customer_id = ?').run(id);
    db.prepare('DELETE FROM jobs WHERE customer_id = ?').run(id);
    db.prepare('DELETE FROM customer_vehicles WHERE customer_id = ?').run(id);
    const info = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Database error deleting customer' });
  }
});

// --- CUSTOMER VEHICLES ---
app.get('/api/customers/:customerId/vehicles', (req, res) => {
  try {
    const { customerId } = req.params;
    const stmt = db.prepare('SELECT * FROM customer_vehicles WHERE customer_id = ? ORDER BY year DESC');
    const rows = stmt.all(customerId);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching customer vehicles:', error);
    res.status(500).json({ error: 'Database error fetching customer vehicles' });
  }
});

app.get('/api/vehicles-all', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT cv.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        (SELECT MAX(date) FROM service_history WHERE vehicle_id = cv.id) as last_service_date
      FROM customer_vehicles cv
      LEFT JOIN customers c ON cv.customer_id = c.id
      ORDER BY cv.year DESC, cv.make ASC
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all vehicles:', error);
    res.status(500).json({ error: 'Database error fetching all vehicles' });
  }
});

app.post('/api/vehicles', (req, res) => {
  try {
    const { customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });
    const stmt = db.prepare(`
      INSERT INTO customer_vehicles (customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage || 0, current_mileage || 0, notes);
    const inserted = db.prepare('SELECT * FROM customer_vehicles WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating customer vehicle:', error);
    res.status(500).json({ error: 'Database error creating customer vehicle' });
  }
});

app.put('/api/vehicles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE customer_vehicles
      SET customer_id = ?, year = ?, make = ?, model = ?, engine = ?, vin = ?, color = ?, purchase_date = ?, purchase_mileage = ?, current_mileage = ?, notes = ?
      WHERE id = ?
    `);
    const info = stmt.run(customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage || 0, current_mileage || 0, notes, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Vehicle not found' });
    const updated = db.prepare('SELECT * FROM customer_vehicles WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating customer vehicle:', error);
    res.status(500).json({ error: 'Database error updating customer vehicle' });
  }
});

app.delete('/api/vehicles/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM service_history WHERE vehicle_id = ?').run(id);
    db.prepare('DELETE FROM appointments WHERE vehicle_id = ?').run(id);
    db.prepare('DELETE FROM jobs WHERE vehicle_id = ?').run(id);
    const info = db.prepare('DELETE FROM customer_vehicles WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Database error deleting vehicle' });
  }
});

// --- SERVICE HISTORY ---
app.get('/api/vehicles/:vehicleId/service-history', (req, res) => {
  try {
    const { vehicleId } = req.params;
    const stmt = db.prepare('SELECT * FROM service_history WHERE vehicle_id = ? ORDER BY date DESC, id DESC');
    const rows = stmt.all(vehicleId);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching service history:', error);
    res.status(500).json({ error: 'Database error fetching service history' });
  }
});

app.post('/api/service-history', (req, res) => {
  try {
    const { vehicle_id, job_id, date, mileage, description, parts_used, cost, technician, notes } = req.body;
    if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id is required' });
    const stmt = db.prepare(`
      INSERT INTO service_history (vehicle_id, job_id, date, mileage, description, parts_used, cost, technician, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(vehicle_id, job_id || null, date, mileage || 0, description, parts_used, cost || 0, technician, notes);
    
    if (mileage) {
      db.prepare(`
        UPDATE customer_vehicles
        SET current_mileage = MAX(current_mileage, ?)
        WHERE id = ?
      `).run(mileage, vehicle_id);
    }

    const inserted = db.prepare('SELECT * FROM service_history WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating service entry:', error);
    res.status(500).json({ error: 'Database error creating service entry' });
  }
});

app.put('/api/service-history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, job_id, date, mileage, description, parts_used, cost, technician, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE service_history
      SET vehicle_id = ?, job_id = ?, date = ?, mileage = ?, description = ?, parts_used = ?, cost = ?, technician = ?, notes = ?
      WHERE id = ?
    `);
    const info = stmt.run(vehicle_id, job_id || null, date, mileage || 0, description, parts_used, cost || 0, technician, notes, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Service entry not found' });

    if (mileage && vehicle_id) {
      db.prepare(`
        UPDATE customer_vehicles
        SET current_mileage = MAX(current_mileage, ?)
        WHERE id = ?
      `).run(mileage, vehicle_id);
    }

    const updated = db.prepare('SELECT * FROM service_history WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating service entry:', error);
    res.status(500).json({ error: 'Database error updating service entry' });
  }
});

app.delete('/api/service-history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM service_history WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Service entry not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service entry:', error);
    res.status(500).json({ error: 'Database error deleting service entry' });
  }
});

// --- VEHICLE MANUALS ---
app.get('/api/vehicle-manuals/:garageVehicleId', (req, res) => {
  try {
    const { garageVehicleId } = req.params;
    const stmt = db.prepare('SELECT * FROM vehicle_manuals WHERE garage_vehicle_id = ? ORDER BY saved_at DESC');
    const rows = stmt.all(garageVehicleId);
    
    // Map snake_case SQLite fields to camelCase for the frontend
    const mapped = rows.map(r => ({
      id: r.id,
      garageVehicleId: r.garage_vehicle_id,
      manualUri: r.manual_uri,
      manualTitle: r.manual_title,
      manualMake: r.manual_make,
      manualYear: r.manual_year,
      manualModel: r.manual_model,
      manualEngine: r.manual_engine,
      savedAt: r.saved_at
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching vehicle manuals:', error);
    res.status(500).json({ error: 'Database error fetching vehicle manuals' });
  }
});

app.post('/api/vehicle-manuals', (req, res) => {
  try {
    const { garageVehicleId, manualUri, manualTitle, manualMake, manualYear, manualModel, manualEngine } = req.body;
    if (!garageVehicleId || !manualUri) {
      return res.status(400).json({ error: 'garageVehicleId and manualUri are required' });
    }
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO vehicle_manuals (garage_vehicle_id, manual_uri, manual_title, manual_make, manual_year, manual_model, manual_engine)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(garageVehicleId, manualUri, manualTitle || '', manualMake || '', manualYear || '', manualModel || '', manualEngine || '');
    const id = info.lastInsertRowid;
    
    const saved = db.prepare('SELECT * FROM vehicle_manuals WHERE id = ?').get(id);
    res.json({
      id: saved.id,
      garageVehicleId: saved.garage_vehicle_id,
      manualUri: saved.manual_uri,
      manualTitle: saved.manual_title,
      manualMake: saved.manual_make,
      manualYear: saved.manual_year,
      manualModel: saved.manual_model,
      manualEngine: saved.manual_engine,
      savedAt: saved.saved_at
    });
  } catch (error) {
    console.error('Error saving vehicle manual:', error);
    res.status(500).json({ error: 'Database error saving vehicle manual' });
  }
});

app.delete('/api/vehicle-manuals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM vehicle_manuals WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Vehicle manual not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle manual:', error);
    res.status(500).json({ error: 'Database error deleting vehicle manual' });
  }
});

// --- SHOP JOBS ---
app.get('/api/jobs', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT j.*, 
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        cv.year as vehicle_year, cv.make as vehicle_make, cv.model as vehicle_model, cv.vin as vehicle_vin, cv.current_mileage as vehicle_current_mileage
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN customer_vehicles cv ON j.vehicle_id = cv.id
      ORDER BY 
        CASE j.status 
          WHEN 'In Progress' THEN 1
          WHEN 'Pending' THEN 2
          WHEN 'Complete' THEN 3
          WHEN 'Cancelled' THEN 4
          ELSE 5
        END, j.estimated_completion ASC, j.created_at DESC
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Database error fetching jobs' });
  }
});

app.get('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT j.*, 
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
        cv.year as vehicle_year, cv.make as vehicle_make, cv.model as vehicle_model, cv.vin as vehicle_vin, cv.engine as vehicle_engine, cv.color as vehicle_color, cv.current_mileage as vehicle_current_mileage
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN customer_vehicles cv ON j.vehicle_id = cv.id
      WHERE j.id = ?
    `);
    const row = stmt.get(id);
    if (!row) return res.status(404).json({ error: 'Job not found' });
    res.json(row);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: 'Database error fetching job details' });
  }
});

app.post('/api/jobs', (req, res) => {
  try {
    const {
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost
    } = req.body;
    if (!customer_id || !vehicle_id) return res.status(400).json({ error: 'customer_id and vehicle_id are required' });
    const stmt = db.prepare(`
      INSERT INTO jobs (
        customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status || 'Pending', estimated_completion, actual_completion || null, labor_cost || 0
    );
    const inserted = db.prepare('SELECT * FROM jobs WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Database error creating job' });
  }
});

app.put('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost
    } = req.body;
    const stmt = db.prepare(`
      UPDATE jobs
      SET customer_id = ?, vehicle_id = ?, description = ?, diagnosis_notes = ?, labor_notes = ?, status = ?, estimated_completion = ?, actual_completion = ?, labor_cost = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = stmt.run(
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost || 0, id
    );
    if (info.changes === 0) return res.status(404).json({ error: 'Job not found' });
    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Database error updating job' });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM job_parts WHERE job_id = ?').run(id);
    const info = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Database error deleting job' });
  }
});

// --- JOB PARTS ---
app.get('/api/jobs/:jobId/parts', (req, res) => {
  try {
    const { jobId } = req.params;
    const stmt = db.prepare('SELECT * FROM job_parts WHERE job_id = ?');
    const rows = stmt.all(jobId);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching job parts:', error);
    res.status(500).json({ error: 'Database error fetching job parts' });
  }
});

app.post('/api/jobs/:jobId/parts', (req, res) => {
  try {
    const { jobId } = req.params;
    const { part_name, part_number, quantity, unit_cost, notes } = req.body;
    const stmt = db.prepare(`
      INSERT INTO job_parts (job_id, part_name, part_number, quantity, unit_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(jobId, part_name, part_number, quantity || 1, unit_cost || 0, notes);
    const inserted = db.prepare('SELECT * FROM job_parts WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (error) {
    console.error('Error adding job part:', error);
    res.status(500).json({ error: 'Database error adding job part' });
  }
});

app.put('/api/jobs/:jobId/parts/:partId', (req, res) => {
  try {
    const { partId } = req.params;
    const { part_name, part_number, quantity, unit_cost, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE job_parts
      SET part_name = ?, part_number = ?, quantity = ?, unit_cost = ?, notes = ?
      WHERE id = ?
    `);
    const info = stmt.run(part_name, part_number, quantity || 1, unit_cost || 0, notes, partId);
    if (info.changes === 0) return res.status(404).json({ error: 'Part not found' });
    const updated = db.prepare('SELECT * FROM job_parts WHERE id = ?').get(partId);
    res.json(updated);
  } catch (error) {
    console.error('Error updating job part:', error);
    res.status(500).json({ error: 'Database error updating job part' });
  }
});

app.delete('/api/jobs/:jobId/parts/:partId', (req, res) => {
  try {
    const { partId } = req.params;
    const stmt = db.prepare('DELETE FROM job_parts WHERE id = ?');
    const info = stmt.run(partId);
    if (info.changes === 0) return res.status(404).json({ error: 'Job part not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing job part:', error);
    res.status(500).json({ error: 'Database error removing job part' });
  }
});

// --- APPOINTMENTS ---
app.get('/api/appointments', (req, res) => {
  try {
    const { month } = req.query; // e.g. 2026-06
    let queryStr = `
      SELECT a.*, 
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        cv.year as vehicle_year, cv.make as vehicle_make, cv.model as vehicle_model, cv.engine as vehicle_engine
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN customer_vehicles cv ON a.vehicle_id = cv.id
    `;
    const params = [];
    if (month) {
      queryStr += ' WHERE a.date LIKE ?';
      params.push(`${month}%`);
    }
    queryStr += ' ORDER BY a.date ASC, a.time ASC';
    const stmt = db.prepare(queryStr);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Database error fetching appointments' });
  }
});

app.post('/api/appointments', (req, res) => {
  try {
    const { title, customer_id, vehicle_id, date, time, duration_minutes, notes } = req.body;
    if (!title || !customer_id || !vehicle_id || !date || !time) {
      return res.status(400).json({ error: 'Required fields missing: title, customer_id, vehicle_id, date, time' });
    }
    const stmt = db.prepare(`
      INSERT INTO appointments (title, customer_id, vehicle_id, date, time, duration_minutes, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(title, customer_id, vehicle_id, date, time, duration_minutes || 60, notes);
    const inserted = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Database error creating appointment' });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, customer_id, vehicle_id, date, time, duration_minutes, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE appointments
      SET title = ?, customer_id = ?, vehicle_id = ?, date = ?, time = ?, duration_minutes = ?, notes = ?
      WHERE id = ?
    `);
    const info = stmt.run(title, customer_id, vehicle_id, date, time, duration_minutes || 60, notes, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Database error updating appointment' });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Database error deleting appointment' });
  }
});

async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = require('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // PRODUCTION PATH - DO NOT CHANGE - must be 'dist' not '../dist'
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Fallback error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`Workshop: Ragnarök homelab backend up!   `);
    console.log(`Listening on http://0.0.0.0:${PORT}       `);
    console.log(`Database source: ${DB_PATH}              `);
    console.log(`Lemon server URL: ${LEMON_SERVER_URL}    `);
    console.log(`=========================================`);
  });
}

initServer().catch(err => {
  console.error('Failed to start unified server:', err);
});
