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
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply auth middleware to all API routes
const { authMiddleware, adminOnly } = require('./middleware/authMiddleware');
app.use('/api', authMiddleware);

// Initialize SQLite database
let db;
try {
  db = new Database(DB_PATH);
  console.log(`Connected to SQLite database at ${DB_PATH}`);
  
  // 8. Create Users Table (created first so foreign keys can reference it)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Ensure the base garage table exists (backwards compatibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS garage (
      garageId INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER,
      nickname TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
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
      estimated_hours REAL DEFAULT NULL,
      mileage_at_intake INTEGER DEFAULT NULL,
      priority TEXT DEFAULT 'Standard',
      customer_approved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN estimated_hours REAL DEFAULT NULL`);
    console.log("Successfully ran migration: ALTER TABLE jobs ADD COLUMN estimated_hours");
  } catch (err) {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN mileage_at_intake INTEGER DEFAULT NULL`);
    console.log("Successfully ran migration: ALTER TABLE jobs ADD COLUMN mileage_at_intake");
  } catch (err) {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN priority TEXT DEFAULT 'Standard'`);
    console.log("Successfully ran migration: ALTER TABLE jobs ADD COLUMN priority");
  } catch (err) {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN customer_approved INTEGER DEFAULT 0`);
    console.log("Successfully ran migration: ALTER TABLE jobs ADD COLUMN customer_approved");
  } catch (err) {
    // Column already exists
  }

  // 5. Create Job Parts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      part_name TEXT,
      part_number TEXT,
      quantity INTEGER DEFAULT 1,
      unit_cost REAL DEFAULT 0,
      notes TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
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
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(garage_vehicle_id, manual_uri)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_flags (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Create Shop Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      shop_name TEXT,
      shop_address TEXT,
      shop_city TEXT,
      shop_state TEXT,
      shop_phone TEXT,
      shop_logo_url TEXT,
      tax_rate REAL DEFAULT 0,
      default_labor_rate REAL DEFAULT 0,
      zip_code TEXT,
      default_parts_markup REAL DEFAULT 0
    )
  `);

  // Create Job Photos Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      photo_data TEXT,
      caption TEXT,
      photo_type TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Receipts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      file_path TEXT,
      photo_data TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      supplier_name TEXT,
      invoice_date TEXT,
      linked_import_summary TEXT,
      notes TEXT
    )
  `);

  // Create Inventory Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT,
      name TEXT NOT NULL,
      category TEXT,
      quantity_on_hand INTEGER DEFAULT 0,
      reorder_threshold INTEGER DEFAULT 0,
      unit_type TEXT DEFAULT 'each',
      cost_price REAL DEFAULT 0,
      sell_price REAL DEFAULT 0,
      supplier_name TEXT,
      location TEXT,
      core_charge REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Work Order Parts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_order_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
      part_name_snapshot TEXT,
      part_number TEXT,
      quantity_used INTEGER DEFAULT 1,
      price_charged REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Inventory Adjustments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Services Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_price REAL NOT NULL,
      included_hours REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Job Services Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      service_name_snapshot TEXT NOT NULL,
      base_price_charged REAL NOT NULL,
      additional_hours REAL DEFAULT 0,
      additional_hours_cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Email Templates Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Emails Sent Log Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS emails_sent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      to_email TEXT NOT NULL,
      to_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
      status TEXT NOT NULL,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate columns for shop_settings table
  const shopSettingsCols = [
    { name: 'user_id', type: 'INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE' },
    { name: 'shop_name', type: 'TEXT' },
    { name: 'shop_address', type: 'TEXT' },
    { name: 'shop_city', type: 'TEXT' },
    { name: 'shop_state', type: 'TEXT' },
    { name: 'shop_phone', type: 'TEXT' },
    { name: 'shop_logo_url', type: 'TEXT' },
    { name: 'tax_rate', type: 'REAL DEFAULT 0' },
    { name: 'default_labor_rate', type: 'REAL DEFAULT 0' },
    { name: 'zip_code', type: 'TEXT' },
    { name: 'default_parts_markup', type: 'REAL DEFAULT 0' }
  ];
  try {
    const columns = db.prepare('PRAGMA table_info(shop_settings)').all();
    for (const col of shopSettingsCols) {
      const hasCol = columns.some(c => c.name === col.name);
      if (!hasCol) {
        db.exec(`ALTER TABLE shop_settings ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Successfully migrated shop_settings to include ${col.name} column.`);
      }
    }
  } catch (err) {
    console.error('Error migrating shop_settings columns:', err);
  }

  // Migration: Ensure user_id column exists in all target tables
  const targetTables = [
    'customers',
    'customer_vehicles',
    'jobs',
    'job_parts',
    'service_history',
    'appointments',
    'garage',
    'vehicle_manuals',
    'job_photos',
    'inventory_items',
    'work_order_parts',
    'inventory_adjustments'
  ];

  for (const tableName of targetTables) {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasUserId = columns.some(col => col.name === 'user_id');
    if (!hasUserId) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
      console.log(`Successfully migrated ${tableName} to include user_id column.`);
    }
  }

  // Migrate work_order_parts: Ensure part_number column exists
  try {
    const columns = db.prepare("PRAGMA table_info(work_order_parts)").all();
    const hasPartNumber = columns.some(col => col.name === 'part_number');
    if (!hasPartNumber) {
      db.exec("ALTER TABLE work_order_parts ADD COLUMN part_number TEXT");
      console.log("Successfully migrated work_order_parts to include part_number column.");
    }
  } catch (err) {
    console.error("Error migrating work_order_parts part_number column:", err);
  }

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

    // Seed initial Inventory Items
    console.log('Seeding initial Inventory Items...');
    const seedInv = [
      ['SP-101', 'Brake Pads Front (Ceramic)', 'brakes', 15, 5, 'each', 22.50, 45.00, 'NAPA Auto Parts', 'Shelf A-1', 0, 'High quality ceramic pads'],
      ['FL-202', 'Full Synthetic Oil 5W-30', 'fluids', 45, 12, 'quart', 4.50, 8.99, 'Valvoline Corp', 'Shelf B-3', 0, '5W-30 motor oil'],
      ['FL-203', 'Oil Filter (Premium)', 'filters', 20, 6, 'each', 3.20, 7.50, 'Fram Filters', 'Shelf B-4', 0, 'Spin-on oil filter'],
      ['EL-301', 'Heavy Duty Alternator 160A', 'electrical', 2, 1, 'each', 110.00, 185.00, 'ACDelco', 'Shelf C-2', 45.00, 'Requires core return'],
      ['EG-401', 'Spark Plug (Iridium)', 'engine', 32, 10, 'each', 4.20, 9.50, 'NGK Spark Plugs', 'Shelf B-1', 0, 'Pre-gapped to 0.040"']
    ];
    for (const [part, name, cat, qty, reorder, unit, cost, sell, supp, loc, core, note] of seedInv) {
      db.prepare(`
        INSERT INTO inventory_items (part_number, name, category, quantity_on_hand, reorder_threshold, unit_type, cost_price, sell_price, supplier_name, location, core_charge, notes, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(part, name, cat, qty, reorder, unit, cost, sell, supp, loc, core, note);
    }

    // Seed some work order parts for historical jobs (e.g. Job 3 is spark plug tune-up, which has id = 3)
    db.prepare(`
      INSERT INTO work_order_parts (job_id, inventory_item_id, part_name_snapshot, quantity_used, price_charged, user_id)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(3, 5, 'Spark Plug (Iridium)', 8, 9.50);

    db.prepare(
      'INSERT INTO app_flags (key, value) VALUES (?, ?)'
    ).run('initial_seed_done', 'true');
  }

  // Data Backfill: Ensure existing rows have user_id = 1 if user_id is currently NULL
  for (const tableName of targetTables) {
    const stmt = db.prepare(`UPDATE ${tableName} SET user_id = 1 WHERE user_id IS NULL`);
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`Backfilled ${result.changes} rows in ${tableName} with user_id = 1`);
    }
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
      WHERE g.user_id = ?
    `);
    const rows = stmt.all(req.user.id);
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

    const stmt = db.prepare('INSERT INTO garage (vehicleId, nickname, user_id) VALUES (?, ?, ?)');
    const info = stmt.run(vehicleId, nickname || null, req.user.id);
    const garageId = info.lastInsertRowid;

    // Join and fetch the newly inserted garage profile
    const item = db.prepare(`
      SELECT g.garageId, g.nickname, v.id, v.source, v.make, v.year, v.model, v.engine, v.uriPath, v.isComplete
      FROM garage g
      JOIN vehicles v ON g.vehicleId = v.id
      WHERE g.garageId = ? AND g.user_id = ?
    `).get(garageId, req.user.id);

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
    const stmt = db.prepare('DELETE FROM garage WHERE garageId = ? AND user_id = ?');
    const info = stmt.run(garageId, req.user.id);
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
    const uri = req.query.uri;
    if (!uri) return res.status(400).json({ error: 'Missing uri parameter' });
    const targetUrl = `${LEMON_SERVER_URL}${uri}`;
    console.log(`Fetching from lemon-server: ${targetUrl}`);

    const response = await fetch(targetUrl);
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(200).json({ pageType: 'notfound', title: 'Page Not Found', blocks: [] });
      }
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

      // Process only top-level lists to avoid double-processing nested <ul> elements.
      // Pages like Technical Data use li.li-folder with <a name="..."> headers and
      // nested <ul> children — processing all lists with find('ul,ol') caused the
      // outer list to grab nested li items (via recursive .find('li')) while also
      // processing the same nested <ul> a second time, producing duplicates and
      // corrupted href paths with section-anchor names baked into them.
      const topLists = $content.children('ul, ol').toArray()
        .concat($content.find('> * > ul, > * > ol').toArray())
        .filter((el, idx, arr) => {
          // Keep only lists that are not nested inside another list
          return $(el).parents('ul, ol').length === 0;
        });

      // Recursively process a <ul>/<ol> list element into tree nodes.
      // Handles arbitrary nesting depth via li-folder pattern:
      //   li.li-folder > a[name] + ul  →  category node with children
      //   li > a[href]                 →  leaf link node
      const processList = (listEl) => {
        const results = [];
        $(listEl).children('li').each((i, liEl) => {
          const $li = $(liEl);
          const $nestedList = $li.children('ul, ol').first();
          if ($nestedList.length > 0) {
            // Folder node: header from direct <a name="..."> child
            const $header = $li.children('a').first();
            const folderTitle = $header.text().trim();
            const folderChildren = processList($nestedList[0]);
            if (folderChildren.length > 0) {
              if (folderTitle) {
                results.push({
                  type: 'category',
                  title: folderTitle,
                  icon: '/icons/service-and-repair.svg',
                  children: folderChildren
                });
              } else {
                results.push(...folderChildren);
              }
            }
          } else {
            // Leaf node: direct <a href="..."> child
            const $a = $li.children('a').first();
            if ($a.length === 0) return;
            const linkTitle = $a.text().trim();
            const href = $a.attr('href') || '';
            if (!linkTitle) return;
            const isDownload = href.startsWith('/bundle/') || href.endsWith('.zip');
            results.push({
              type: 'link',
              title: linkTitle,
              icon: isDownload ? '/icons/download.svg' : '/icons/service-and-repair.svg',
              href: href
            });
          }
        });
        return results;
      };

      topLists.forEach((listEl) => {
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

        const children = processList(listEl);

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
          } else if (tagName === 'p') {
            // Mirrors the same fix applied inside nested div[id^="S"] wrappers —
            // catches paragraphs that sit directly under div.main with no wrapper div.
            flushParts();
            const text = $node.text().trim();
            if (text) blocks.push({ type: 'paragraph', text });
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
                // Check if this table is purely an image container (imageHolder pattern).
                // LEMON pages often wrap images in a single-cell table with a div.imageHolder.
                // We extract these as image blocks rather than tables to render them properly.
                const imageCells = $dNode.find('div.imageHolder');
                if (imageCells.length > 0 && $dNode.find('td').length === imageCells.length) {
                  // All cells are image holders — extract as image blocks
                  imageCells.each((k, holder) => {
                    const $holder = $(holder);
                    const caption = $holder.find('.imageCaption').first().text().trim();
                    if (caption) blocks.push({ type: 'heading', text: caption });
                    const src = $holder.find('img').first().attr('src');
                    if (src) blocks.push({ type: 'image', src });
                  });
                } else {
                  const tableData = [];
                  $dNode.find('tr').each((i, row) => {
                    const rowData = [];
                    $(row).find('td, th').each((j, cell) => {
                      const $cell = $(cell);
                      // If this cell contains an imageHolder, extract image separately
                      const $imgHolder = $cell.find('div.imageHolder').first();
                      if ($imgHolder.length > 0) {
                        const src = $imgHolder.find('img').first().attr('src');
                        if (src) blocks.push({ type: 'image', src });
                        return; // skip adding this cell to tableData
                      }
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
              } else if (dTagName === 'ul' || dTagName === 'ol') {
                flushParts();
                // Handle bullet/numbered lists inside LEMON content divs
                $dNode.children('li').each((liIdx, liEl) => {
                  const $li = $(liEl);
                  const $a = $li.children('a').first();
                  if ($a.length > 0) {
                    let href = $a.attr('href') || '';
                    if (href.startsWith('/hyperlink/')) href = href.substring(11);
                    else if (href.startsWith('hyperlink/')) href = href.substring(10);
                    if (!href.startsWith('/')) href = '/' + href;
                    const linkText = $a.text().trim();
                    if (linkText) blocks.push({ type: 'paragraph', parts: [{ type: 'internalLink', text: linkText, href }] });
                  } else {
                    const text = $li.text().trim();
                    if (text) blocks.push({ type: 'paragraph', text });
                  }
                });
              } else if (dTagName === 'p') {
                // Some LEMON pages wrap plain paragraph text directly in <p> tags
                // inside the div[id^="S"] wrapper (e.g. wiring diagram intro pages).
                // Without this case, all such paragraph text was silently dropped.
                flushParts();
                const text = $dNode.text().trim();
                if (text) blocks.push({ type: 'paragraph', text });
              } else if (dTagName === 'div' && $dNode.hasClass('imageHolder')) {
                // imageHolder wraps an imageHeader (caption) plus an <img> tag.
                // The generic div fallback below only grabs combined .text(), which
                // captured the caption but silently dropped the <img> entirely since
                // it never searches descendants for image tags.
                flushParts();
                const caption = $dNode.find('.imageCaption').first().text().trim();
                if (caption) blocks.push({ type: 'heading', text: caption });
                const src = $dNode.find('img').first().attr('src');
                if (src) blocks.push({ type: 'image', src });
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
            // Check if this table is purely an image container (imageHolder pattern).
            // LEMON pages often wrap images in a single-cell table with a div.imageHolder.
            // We extract these as image blocks rather than tables to render them properly.
            const imageCells = $node.find('div.imageHolder');
            if (imageCells.length > 0 && $node.find('td').length === imageCells.length) {
              // All cells are image holders — extract as image blocks
              imageCells.each((k, holder) => {
                const $holder = $(holder);
                const caption = $holder.find('.imageCaption').first().text().trim();
                if (caption) blocks.push({ type: 'heading', text: caption });
                const src = $holder.find('img').first().attr('src');
                if (src) blocks.push({ type: 'image', src });
              });
            } else {
              const tableData = [];
              $node.find('tr').each((i, row) => {
                const rowData = [];
                $(row).find('td, th').each((j, cell) => {
                  const $cell = $(cell);
                  // If this cell contains an imageHolder, extract image separately
                  const $imgHolder = $cell.find('div.imageHolder').first();
                  if ($imgHolder.length > 0) {
                    const src = $imgHolder.find('img').first().attr('src');
                    if (src) blocks.push({ type: 'image', src });
                    return; // skip adding this cell to tableData
                  }
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
          } else if (tagName === 'table') {
            flushCurrentParts();
            // Check if this table is purely an image container (imageHolder pattern).
            const imageCells = $node.find('div.imageHolder');
            if (imageCells.length > 0 && $node.find('td').length === imageCells.length) {
              // All cells are image holders — extract as image blocks
              imageCells.each((k, holder) => {
                const $holder = $(holder);
                const caption = $holder.find('.imageCaption').first().text().trim();
                if (caption) blocks.push({ type: 'heading', text: caption });
                const src = $holder.find('img').first().attr('src');
                if (src) blocks.push({ type: 'image', src });
              });
            } else {
              const tableData = [];
              $node.find('tr').each((i, row) => {
                const rowData = [];
                $(row).find('td, th').each((j, cell) => {
                  const $cell = $(cell);
                  // If this cell contains an imageHolder, extract image separately
                  const $imgHolder = $cell.find('div.imageHolder').first();
                  if ($imgHolder.length > 0) {
                    const src = $imgHolder.find('img').first().attr('src');
                    if (src) blocks.push({ type: 'image', src });
                    return; // skip adding this cell to tableData
                  }
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
          } else if (tagName === 'div') {
            // Some pages (e.g. Fluids quick-lookup tables) wrap their table in a
            // div like <div id="fluid001" class="infoObjPrint"> that doesn't match
            // div[id^="S"], so this fallback parser never recurses into it. Without
            // this case, processInlineNode silently discarded the entire table.
            flushCurrentParts();
            const innerTable = $node.find('table').first();
            if (innerTable.length > 0) {
              // Check if this table is purely an image container (imageHolder pattern).
              const imageCells = innerTable.find('div.imageHolder');
              if (imageCells.length > 0 && innerTable.find('td').length === imageCells.length) {
                // All cells are image holders — extract as image blocks
                imageCells.each((k, holder) => {
                  const $holder = $(holder);
                  const caption = $holder.find('.imageCaption').first().text().trim();
                  if (caption) blocks.push({ type: 'heading', text: caption });
                  const src = $holder.find('img').first().attr('src');
                  if (src) blocks.push({ type: 'image', src });
                });
              } else {
                const tableData = [];
                innerTable.find('tr').each((i, row) => {
                  const rowData = [];
                  $(row).find('td, th').each((j, cell) => {
                    const $cell = $(cell);
                    // If this cell contains an imageHolder, extract image separately
                    const $imgHolder = $cell.find('div.imageHolder').first();
                    if ($imgHolder.length > 0) {
                      const src = $imgHolder.find('img').first().attr('src');
                      if (src) blocks.push({ type: 'image', src });
                      return; // skip adding this cell to tableData
                    }
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
            } else {
              const text = $node.text().trim();
              if (text) blocks.push({ type: 'paragraph', text });
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
    
    const customersCount = db.prepare('SELECT count(*) as count FROM customers WHERE user_id = ?').get(req.user.id).count || 0;
    const vehiclesCount = db.prepare('SELECT count(*) as count FROM customer_vehicles WHERE user_id = ?').get(req.user.id).count || 0;
    const activeJobsCount = db.prepare("SELECT count(*) as count FROM jobs WHERE status != 'Complete' AND status != 'Cancelled' AND user_id = ?").get(req.user.id).count || 0;

    // FIX 2 Additions
    let avgRepairHours = 0;
    const completedOrInProgressJobs = db.prepare(`
      SELECT created_at, actual_completion, updated_at, status FROM jobs 
      WHERE user_id = ? AND (status = 'Complete' OR status = 'In Progress')
    `).all(req.user.id);

    if (completedOrInProgressJobs.length > 0) {
      let totalHours = 0;
      let count = 0;
      for (const j of completedOrInProgressJobs) {
        const start = new Date(j.created_at).getTime();
        const endStr = j.actual_completion || j.updated_at || new Date().toISOString();
        const end = new Date(endStr).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          totalHours += (end - start) / (1000 * 60 * 60);
          count++;
        }
      }
      if (count > 0) {
        avgRepairHours = totalHours / count;
      }
    }

    const lowStockCount = db.prepare('SELECT count(*) as count FROM inventory_items WHERE quantity_on_hand <= reorder_threshold AND user_id = ?').get(req.user.id).count || 0;
    const queueCount = db.prepare("SELECT count(*) as count FROM jobs WHERE (status = 'Pending' OR status = 'In Progress') AND user_id = ?").get(req.user.id).count || 0;

    const pendingHoursRow = db.prepare(`
      SELECT SUM(COALESCE(estimated_hours, 0)) as total_hours FROM jobs
      WHERE user_id = ? AND (status = 'Pending' OR status = 'In Progress')
    `).get(req.user.id);
    const totalPendingHours = pendingHoursRow ? (pendingHoursRow.total_hours || 0) : 0;

    res.json({
      totalManuals,
      totalCustomers: customersCount,
      totalVehicles: vehiclesCount,
      activeJobs: activeJobsCount,
      avgRepairHours,
      totalPendingHours,
      lowStockCount,
      queueCount
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Database error fetching stats' });
  }
});

// --- SHOP SETTINGS ---
app.get('/api/shop-settings', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(req.user.id);
    if (!settings) {
      // Create a default empty shop settings row for the user
      const stmt = db.prepare(`
        INSERT INTO shop_settings (user_id, shop_name, shop_address, shop_city, shop_state, shop_phone, shop_logo_url, tax_rate, default_labor_rate, zip_code, default_parts_markup)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(req.user.id, '', '', '', '', '', '', 0, 0, '', 0);
      settings = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(req.user.id);
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching shop settings:', error);
    res.status(500).json({ error: 'Database error fetching shop settings' });
  }
});

app.put('/api/shop-settings', (req, res) => {
  try {
    const { shop_name, shop_address, shop_city, shop_state, shop_phone, shop_logo_url, tax_rate, default_labor_rate, zip_code, default_parts_markup } = req.body;
    
    const settings = db.prepare('SELECT id FROM shop_settings WHERE user_id = ?').get(req.user.id);
    if (!settings) {
      const stmt = db.prepare(`
        INSERT INTO shop_settings (user_id, shop_name, shop_address, shop_city, shop_state, shop_phone, shop_logo_url, tax_rate, default_labor_rate, zip_code, default_parts_markup)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(req.user.id, shop_name || '', shop_address || '', shop_city || '', shop_state || '', shop_phone || '', shop_logo_url || '', tax_rate || 0, default_labor_rate || 0, zip_code || '', default_parts_markup || 0);
    } else {
      const stmt = db.prepare(`
        UPDATE shop_settings
        SET shop_name = ?, shop_address = ?, shop_city = ?, shop_state = ?, shop_phone = ?, shop_logo_url = ?, tax_rate = ?, default_labor_rate = ?, zip_code = ?, default_parts_markup = ?
        WHERE user_id = ?
      `);
      stmt.run(shop_name || '', shop_address || '', shop_city || '', shop_state || '', shop_phone || '', shop_logo_url || '', tax_rate || 0, default_labor_rate || 0, zip_code || '', default_parts_markup || 0, req.user.id);
    }
    
    const updated = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating shop settings:', error);
    res.status(500).json({ error: 'Database error updating shop settings' });
  }
});

// --- CUSTOMERS ---
app.get('/api/customers', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT c.*, 
        (SELECT count(*) FROM customer_vehicles WHERE customer_id = c.id AND user_id = ?) as vehicle_count,
        (SELECT MAX(date) FROM service_history sh JOIN customer_vehicles cv ON sh.vehicle_id = cv.id WHERE cv.customer_id = c.id AND sh.user_id = ?) as last_visit
      FROM customers c 
      WHERE c.user_id = ?
      ORDER BY c.name ASC
    `);
    const rows = stmt.all(req.user.id, req.user.id, req.user.id);
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
    const stmt = db.prepare('INSERT INTO customers (name, phone, email, address, notes, user_id) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, phone, email, address, notes, req.user.id);
    const inserted = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
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
    const stmt = db.prepare('UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ? AND user_id = ?');
    const info = stmt.run(name, phone, email, address, notes, id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    const updated = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Database error updating customer' });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership
    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    db.prepare('DELETE FROM appointments WHERE customer_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('DELETE FROM jobs WHERE customer_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('DELETE FROM customer_vehicles WHERE customer_id = ? AND user_id = ?').run(id, req.user.id);
    const info = db.prepare('DELETE FROM customers WHERE id = ? AND user_id = ?').run(id, req.user.id);
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
    const stmt = db.prepare('SELECT * FROM customer_vehicles WHERE customer_id = ? AND user_id = ? ORDER BY year DESC');
    const rows = stmt.all(customerId, req.user.id);
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
        (SELECT MAX(date) FROM service_history WHERE vehicle_id = cv.id AND user_id = ?) as last_service_date
      FROM customer_vehicles cv
      LEFT JOIN customers c ON cv.customer_id = c.id
      WHERE cv.user_id = ?
      ORDER BY cv.year DESC, cv.make ASC
    `);
    const rows = stmt.all(req.user.id, req.user.id);
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

    // Verify customer ownership
    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(customer_id, req.user.id);
    if (!customer) return res.status(400).json({ error: 'Invalid or unauthorized customer_id' });

    const stmt = db.prepare(`
      INSERT INTO customer_vehicles (customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage || 0, current_mileage || 0, notes, req.user.id);
    const inserted = db.prepare('SELECT * FROM customer_vehicles WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
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

    // Verify vehicle ownership
    const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    if (customer_id) {
      const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(customer_id, req.user.id);
      if (!customer) return res.status(400).json({ error: 'Invalid or unauthorized customer_id' });
    }

    const stmt = db.prepare(`
      UPDATE customer_vehicles
      SET customer_id = ?, year = ?, make = ?, model = ?, engine = ?, vin = ?, color = ?, purchase_date = ?, purchase_mileage = ?, current_mileage = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(customer_id, year, make, model, engine, vin, color, purchase_date, purchase_mileage || 0, current_mileage || 0, notes, id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Vehicle not found' });
    const updated = db.prepare('SELECT * FROM customer_vehicles WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating customer vehicle:', error);
    res.status(500).json({ error: 'Database error updating customer vehicle' });
  }
});

app.delete('/api/vehicles/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership
    const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    db.prepare('DELETE FROM service_history WHERE vehicle_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('DELETE FROM appointments WHERE vehicle_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('DELETE FROM jobs WHERE vehicle_id = ? AND user_id = ?').run(id, req.user.id);
    const info = db.prepare('DELETE FROM customer_vehicles WHERE id = ? AND user_id = ?').run(id, req.user.id);
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
    const stmt = db.prepare('SELECT * FROM service_history WHERE vehicle_id = ? AND user_id = ? ORDER BY date DESC, id DESC');
    const rows = stmt.all(vehicleId, req.user.id);
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

    // Verify vehicle ownership
    const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(vehicle_id, req.user.id);
    if (!vehicle) return res.status(400).json({ error: 'Invalid or unauthorized vehicle_id' });

    if (job_id) {
      const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(job_id, req.user.id);
      if (!job) return res.status(400).json({ error: 'Invalid or unauthorized job_id' });
    }

    const stmt = db.prepare(`
      INSERT INTO service_history (vehicle_id, job_id, date, mileage, description, parts_used, cost, technician, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(vehicle_id, job_id || null, date, mileage || 0, description, parts_used, cost || 0, technician, notes, req.user.id);
    
    if (mileage) {
      db.prepare(`
        UPDATE customer_vehicles
        SET current_mileage = MAX(current_mileage, ?)
        WHERE id = ? AND user_id = ?
      `).run(mileage, vehicle_id, req.user.id);
    }

    const inserted = db.prepare('SELECT * FROM service_history WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
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

    // Verify entry ownership
    const entry = db.prepare('SELECT id FROM service_history WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Service entry not found' });

    if (vehicle_id) {
      const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(vehicle_id, req.user.id);
      if (!vehicle) return res.status(400).json({ error: 'Invalid or unauthorized vehicle_id' });
    }

    if (job_id) {
      const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(job_id, req.user.id);
      if (!job) return res.status(400).json({ error: 'Invalid or unauthorized job_id' });
    }

    const stmt = db.prepare(`
      UPDATE service_history
      SET vehicle_id = ?, job_id = ?, date = ?, mileage = ?, description = ?, parts_used = ?, cost = ?, technician = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(vehicle_id, job_id || null, date, mileage || 0, description, parts_used, cost || 0, technician, notes, id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Service entry not found' });

    if (mileage && vehicle_id) {
      db.prepare(`
        UPDATE customer_vehicles
        SET current_mileage = MAX(current_mileage, ?)
        WHERE id = ? AND user_id = ?
      `).run(mileage, vehicle_id, req.user.id);
    }

    const updated = db.prepare('SELECT * FROM service_history WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating service entry:', error);
    res.status(500).json({ error: 'Database error updating service entry' });
  }
});

app.delete('/api/service-history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM service_history WHERE id = ? AND user_id = ?');
    const info = stmt.run(id, req.user.id);
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
    const stmt = db.prepare('SELECT * FROM vehicle_manuals WHERE garage_vehicle_id = ? AND user_id = ? ORDER BY saved_at DESC');
    const rows = stmt.all(garageVehicleId, req.user.id);
    
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

    // Verify vehicle ownership
    const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(garageVehicleId, req.user.id);
    if (!vehicle) return res.status(400).json({ error: 'Invalid or unauthorized garageVehicleId' });

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO vehicle_manuals (garage_vehicle_id, manual_uri, manual_title, manual_make, manual_year, manual_model, manual_engine, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(garageVehicleId, manualUri, manualTitle || '', manualMake || '', manualYear || '', manualModel || '', manualEngine || '', req.user.id);
    const id = info.lastInsertRowid;
    
    const saved = db.prepare('SELECT * FROM vehicle_manuals WHERE id = ? AND user_id = ?').get(id, req.user.id);
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
    const stmt = db.prepare('DELETE FROM vehicle_manuals WHERE id = ? AND user_id = ?');
    const info = stmt.run(id, req.user.id);
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
      WHERE j.user_id = ?
      ORDER BY 
        CASE j.status 
          WHEN 'In Progress' THEN 1
          WHEN 'Pending' THEN 2
          WHEN 'Complete' THEN 3
          WHEN 'Cancelled' THEN 4
          ELSE 5
        END, j.estimated_completion ASC, j.created_at DESC
    `);
    const rows = stmt.all(req.user.id);
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
      WHERE j.id = ? AND j.user_id = ?
    `);
    const row = stmt.get(id, req.user.id);
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
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost, estimated_hours,
      mileage_at_intake, priority, customer_approved
    } = req.body;
    if (!customer_id || !vehicle_id) return res.status(400).json({ error: 'customer_id and vehicle_id are required' });

    // Verify ownership of customer and vehicle
    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(customer_id, req.user.id);
    if (!customer) return res.status(400).json({ error: 'Invalid or unauthorized customer_id' });

    const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(vehicle_id, req.user.id);
    if (!vehicle) return res.status(400).json({ error: 'Invalid or unauthorized vehicle_id' });

    const estHoursVal = (estimated_hours !== undefined && estimated_hours !== null && estimated_hours !== '') ? parseFloat(estimated_hours) : null;
    const mileageVal = (mileage_at_intake !== undefined && mileage_at_intake !== null && mileage_at_intake !== '') ? parseInt(mileage_at_intake) : null;
    const priorityVal = priority || 'Standard';
    const approvedVal = customer_approved ? 1 : 0;

    const stmt = db.prepare(`
      INSERT INTO jobs (
        customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost, estimated_hours,
        mileage_at_intake, priority, customer_approved, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status || 'Pending', estimated_completion, actual_completion || null, labor_cost || 0, estHoursVal,
      mileageVal, priorityVal, approvedVal, req.user.id
    );
    const inserted = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
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
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost, estimated_hours,
      mileage_at_intake, priority, customer_approved
    } = req.body;

    // Verify ownership of the job
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (customer_id) {
      const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(customer_id, req.user.id);
      if (!customer) return res.status(400).json({ error: 'Invalid or unauthorized customer_id' });
    }

    if (vehicle_id) {
      const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(vehicle_id, req.user.id);
      if (!vehicle) return res.status(400).json({ error: 'Invalid or unauthorized vehicle_id' });
    }

    const estHoursVal = (estimated_hours !== undefined && estimated_hours !== null && estimated_hours !== '') ? parseFloat(estimated_hours) : null;
    const mileageVal = (mileage_at_intake !== undefined && mileage_at_intake !== null && mileage_at_intake !== '') ? parseInt(mileage_at_intake) : null;
    const priorityVal = priority || 'Standard';
    const approvedVal = customer_approved ? 1 : 0;

    const stmt = db.prepare(`
      UPDATE jobs
      SET customer_id = ?, vehicle_id = ?, description = ?, diagnosis_notes = ?, labor_notes = ?, status = ?, estimated_completion = ?, actual_completion = ?, labor_cost = ?, estimated_hours = ?, mileage_at_intake = ?, priority = ?, customer_approved = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(
      customer_id, vehicle_id, description, diagnosis_notes, labor_notes, status, estimated_completion, actual_completion, labor_cost || 0, estHoursVal,
      mileageVal, priorityVal, approvedVal, id, req.user.id
    );
    if (info.changes === 0) return res.status(404).json({ error: 'Job not found' });
    const updated = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Database error updating job' });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    db.prepare('DELETE FROM job_parts WHERE job_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('DELETE FROM work_order_parts WHERE job_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('DELETE FROM job_services WHERE job_id = ? AND user_id = ?').run(id, req.user.id);
    const info = db.prepare('DELETE FROM jobs WHERE id = ? AND user_id = ?').run(id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Database error deleting job' });
  }
});

// --- JOB PHOTOS ---
app.get('/api/jobs/:jobId/photos', (req, res) => {
  try {
    const { jobId } = req.params;

    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const stmt = db.prepare('SELECT * FROM job_photos WHERE job_id = ? AND user_id = ? ORDER BY uploaded_at ASC');
    const rows = stmt.all(jobId, req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching job photos:', error);
    res.status(500).json({ error: 'Database error fetching job photos' });
  }
});

app.post('/api/jobs/:jobId/photos', (req, res) => {
  try {
    const { jobId } = req.params;
    const { photo_data, caption, photo_type } = req.body;

    if (!photo_data) {
      return res.status(400).json({ error: 'Photo data is required' });
    }

    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const stmt = db.prepare(`
      INSERT INTO job_photos (job_id, photo_data, caption, photo_type, user_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(jobId, photo_data, caption || '', photo_type || 'before', req.user.id);
    const inserted = db.prepare('SELECT * FROM job_photos WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
    res.json(inserted);
  } catch (error) {
    console.error('Error adding job photo:', error);
    res.status(500).json({ error: 'Database error adding job photo' });
  }
});

app.delete('/api/jobs/:jobId/photos/:photoId', (req, res) => {
  try {
    const { photoId } = req.params;
    
    // Deleting is scoped to user_id for safety
    const stmt = db.prepare('DELETE FROM job_photos WHERE id = ? AND user_id = ?');
    const info = stmt.run(photoId, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Job photo not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing job photo:', error);
    res.status(500).json({ error: 'Database error removing job photo' });
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
      WHERE a.user_id = ?
    `;
    const params = [req.user.id];
    if (month) {
      queryStr += ' AND a.date LIKE ?';
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

    // Verify ownership of customer and vehicle
    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(customer_id, req.user.id);
    if (!customer) return res.status(400).json({ error: 'Invalid or unauthorized customer_id' });

    const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(vehicle_id, req.user.id);
    if (!vehicle) return res.status(400).json({ error: 'Invalid or unauthorized vehicle_id' });

    const stmt = db.prepare(`
      INSERT INTO appointments (title, customer_id, vehicle_id, date, time, duration_minutes, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(title, customer_id, vehicle_id, date, time, duration_minutes || 60, notes, req.user.id);
    const inserted = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
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

    // Verify appointment ownership
    const appt = db.prepare('SELECT id FROM appointments WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    if (customer_id) {
      const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?').get(customer_id, req.user.id);
      if (!customer) return res.status(400).json({ error: 'Invalid or unauthorized customer_id' });
    }

    if (vehicle_id) {
      const vehicle = db.prepare('SELECT id FROM customer_vehicles WHERE id = ? AND user_id = ?').get(vehicle_id, req.user.id);
      if (!vehicle) return res.status(400).json({ error: 'Invalid or unauthorized vehicle_id' });
    }

    const stmt = db.prepare(`
      UPDATE appointments
      SET title = ?, customer_id = ?, vehicle_id = ?, date = ?, time = ?, duration_minutes = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(title, customer_id, vehicle_id, date, time, duration_minutes || 60, notes, id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
    const updated = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Database error updating appointment' });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM appointments WHERE id = ? AND user_id = ?');
    const info = stmt.run(id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Database error deleting appointment' });
  }
});

// --- INVENTORY MANAGEMENT ---
app.get('/api/inventory', (req, res) => {
  try {
    const { q, category } = req.query;
    let queryStr = 'SELECT * FROM inventory_items WHERE user_id = ?';
    const params = [req.user.id];
    
    if (category) {
      queryStr += ' AND category = ?';
      params.push(category);
    }
    if (q) {
      queryStr += ' AND (LOWER(name) LIKE ? OR LOWER(part_number) LIKE ?)';
      const term = `%${q.toLowerCase()}%`;
      params.push(term, term);
    }
    
    queryStr += ' ORDER BY name ASC';
    const rows = db.prepare(queryStr).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Database error fetching inventory' });
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    const { part_number, name, category, quantity_on_hand, reorder_threshold, unit_type, cost_price, sell_price, supplier_name, location, core_charge, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const stmt = db.prepare(`
      INSERT INTO inventory_items (
        part_number, name, category, quantity_on_hand, reorder_threshold, unit_type, cost_price, sell_price, supplier_name, location, core_charge, notes, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      part_number || '', name, category || 'other', quantity_on_hand || 0, reorder_threshold || 0, unit_type || 'each',
      cost_price || 0, sell_price || 0, supplier_name || '', location || '', core_charge || 0, notes || '', req.user.id
    );
    const inserted = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: 'Database error creating inventory item' });
  }
});

app.get('/api/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Inventory item not found' });
    res.json(row);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Database error fetching inventory item' });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { part_number, name, category, quantity_on_hand, reorder_threshold, unit_type, cost_price, sell_price, supplier_name, location, core_charge, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const stmt = db.prepare(`
      UPDATE inventory_items
      SET part_number = ?, name = ?, category = ?, quantity_on_hand = ?, reorder_threshold = ?, unit_type = ?,
          cost_price = ?, sell_price = ?, supplier_name = ?, location = ?, core_charge = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(
      part_number || '', name, category || 'other', quantity_on_hand || 0, reorder_threshold || 0, unit_type || 'each',
      cost_price || 0, sell_price || 0, supplier_name || '', location || '', core_charge || 0, notes || '', id, req.user.id
    );
    if (info.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });
    const updated = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Database error updating inventory item' });
  }
});

app.delete('/api/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM inventory_items WHERE id = ? AND user_id = ?').run(id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: 'Database error deleting inventory item' });
  }
});

app.post('/api/inventory/:id/adjust', (req, res) => {
  try {
    const { id } = req.params;
    const { delta, reason } = req.body;
    if (delta === undefined || !reason) {
      return res.status(400).json({ error: 'Delta and reason are required' });
    }
    const d = parseInt(delta, 10);
    if (isNaN(d)) return res.status(400).json({ error: 'Invalid delta value' });
    
    // Verify item ownership
    const item = db.prepare('SELECT id, quantity_on_hand FROM inventory_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });
    
    // Log adjustment
    db.prepare(`
      INSERT INTO inventory_adjustments (item_id, delta, reason, user_id)
      VALUES (?, ?, ?, ?)
    `).run(id, d, reason, req.user.id);
    
    // Update quantity
    db.prepare('UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ? WHERE id = ? AND user_id = ?').run(d, id, req.user.id);
    
    const updated = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ error: 'Database error adjusting inventory' });
  }
});

app.post('/api/inventory/parse-invoice', async (req, res) => {
  const requestId = Date.now().toString().slice(-6);
  console.log(`[ParseInvoice ${requestId}] Received invoice parsing request.`);
  try {
    let base64Data = req.body.image;
    let mimeType = req.body.mimeType || 'image/jpeg';
    
    if (!base64Data) {
      console.warn(`[ParseInvoice ${requestId}] Validation failed: No image data provided.`);
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      mimeType = parts[0].replace('data:', '').split(';')[0];
      base64Data = parts[1];
    }

    console.log(`[ParseInvoice ${requestId}] Image MIME type detected: ${mimeType}. Size: ${Math.round((base64Data.length * 0.75) / 1024)} KB.`);

    const { GoogleGenAI, Type } = require('@google/genai');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error(`[ParseInvoice ${requestId}] GEMINI_API_KEY environment variable is not defined.`);
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const aiInventory = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    console.log(`[ParseInvoice ${requestId}] Sending request to Gemini (gemini-3.5-flash)...`);
    const startTime = Date.now();
    const response = await aiInventory.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `You are an expert invoice and receipt parsing assistant.
Analyze this invoice or receipt image and extract every line item/purchased part as a structured JSON.

Ensure that:
1. "supplier_name": Extract the business/supplier/seller name from the top header of the receipt. If not visible or unclear, use null.
2. "date": Extract the date of purchase. Format it as YYYY-MM-DD. If not visible or unclear, use null.
3. "line_items": An array of each part or item listed in the transaction. Each line item MUST have:
   - "name": Cleaned up, descriptive, friendly name of the part/item. For example, simplify cryptic codes but keep key words (e.g. "Brake Pads Front Ceramic" instead of "K772 BRK PAD CER").
   - "part_number": The SKU, product ID, or part number if visible (or null if not visible).
   - "quantity": The number of units purchased (decimal or integer). If not listed, default to 1.
   - "unit_price": The cost/price per single unit (a decimal number). If not listed, calculate it from total_price / quantity or use total_price.
   - "total_price": The total price for this line (a decimal number).

If the image is not a receipt or invoice, or if it is too blurry/unreadable to extract any items, please return an object with an "error" property containing a helpful message or fail the parsing request. Otherwise, return exactly the JSON specified.`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplier_name: { type: Type.STRING, description: "The supplier/store name" },
            date: { type: Type.STRING, description: "The date of purchase in YYYY-MM-DD format, or null" },
            line_items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  part_number: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit_price: { type: Type.NUMBER },
                  total_price: { type: Type.NUMBER }
                },
                required: ['name', 'quantity', 'unit_price', 'total_price']
              }
            }
          },
          required: ['line_items']
        }
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[ParseInvoice ${requestId}] Gemini responded in ${(duration / 1000).toFixed(2)}s.`);

    const text = response.text;
    if (!text) {
      console.error(`[ParseInvoice ${requestId}] Empty response from Gemini.`);
      throw new Error('No text returned from Gemini API');
    }

    console.log(`[ParseInvoice ${requestId}] Parsing response text:`, text.trim());
    const parsed = JSON.parse(text.trim());
    if (parsed.error) {
      console.warn(`[ParseInvoice ${requestId}] Gemini returned structured error:`, parsed.error);
      return res.status(422).json({ error: parsed.error });
    }

    if (!parsed.line_items || parsed.line_items.length === 0) {
      console.warn(`[ParseInvoice ${requestId}] No line items found in parsed response.`);
      return res.status(422).json({ error: "Could not find any line items on this receipt. Please ensure it is a clear picture of a receipt or invoice." });
    }

    console.log(`[ParseInvoice ${requestId}] Successfully parsed ${parsed.line_items.length} line items from supplier: ${parsed.supplier_name}`);
    res.json(parsed);
  } catch (error) {
    console.error(`[ParseInvoice ${requestId}] Exception during invoice parsing:`, error);
    res.status(500).json({ error: error.message || 'Failed to parse invoice. Please make sure the image is a clear receipt and try again.' });
  }
});

// --- WORK ORDER INTEGRATION ENDPOINTS ---
app.get('/api/jobs/:jobId/parts', (req, res) => {
  try {
    const { jobId } = req.params;
    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const stmt = db.prepare(`
      SELECT w.*, COALESCE(w.part_number, i.part_number) AS part_number, i.name as inventory_name, i.category, i.reorder_threshold, i.quantity_on_hand
      FROM work_order_parts w
      LEFT JOIN inventory_items i ON w.inventory_item_id = i.id
      WHERE w.job_id = ? AND w.user_id = ?
    `);
    const rows = stmt.all(jobId, req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching job parts:', error);
    res.status(500).json({ error: 'Database error fetching job parts' });
  }
});

app.post('/api/jobs/:jobId/parts', (req, res) => {
  try {
    const { jobId } = req.params;
    const { inventory_item_id, part_name_snapshot, part_number, quantity_used, price_charged } = req.body;
    
    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    let finalPartName = part_name_snapshot;
    let finalPriceCharged = price_charged || 0;
    let belowThreshold = false;
    
    if (inventory_item_id) {
      const item = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND user_id = ?').get(inventory_item_id, req.user.id);
      if (!item) return res.status(404).json({ error: 'Inventory item not found' });
      
      if (!finalPartName) {
        finalPartName = item.name;
      }
      if (price_charged === undefined) {
        finalPriceCharged = item.sell_price;
      }
      
      // Decrement inventory stock
      const qty = parseInt(quantity_used, 10) || 1;
      db.prepare('UPDATE inventory_items SET quantity_on_hand = quantity_on_hand - ? WHERE id = ? AND user_id = ?')
        .run(qty, inventory_item_id, req.user.id);
        
      // Get updated stock to check threshold
      const updatedItem = db.prepare('SELECT quantity_on_hand, reorder_threshold FROM inventory_items WHERE id = ? AND user_id = ?').get(inventory_item_id, req.user.id);
      belowThreshold = updatedItem.quantity_on_hand < updatedItem.reorder_threshold;
    }
    
    const qty = parseInt(quantity_used, 10) || 1;
    
    // Insert into work_order_parts
    db.prepare(`
      INSERT INTO work_order_parts (job_id, inventory_item_id, part_name_snapshot, part_number, quantity_used, price_charged, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(jobId, inventory_item_id || null, finalPartName, part_number || null, qty, finalPriceCharged, req.user.id);
    
    // Get updated list of parts
    const stmt = db.prepare(`
      SELECT w.*, COALESCE(w.part_number, i.part_number) AS part_number, i.name as inventory_name, i.category, i.reorder_threshold, i.quantity_on_hand
      FROM work_order_parts w
      LEFT JOIN inventory_items i ON w.inventory_item_id = i.id
      WHERE w.job_id = ? AND w.user_id = ?
    `);
    const parts = stmt.all(jobId, req.user.id);
    
    res.json({
      parts,
      isBelowThreshold: belowThreshold
    });
  } catch (error) {
    console.error('Error adding work order part:', error);
    res.status(500).json({ error: 'Database error adding work order part' });
  }
});

app.put('/api/jobs/:jobId/parts/:partId', (req, res) => {
  try {
    const { jobId, partId } = req.params;
    const { part_name, part_name_snapshot, part_number, quantity, quantity_used, unit_cost, price_charged } = req.body;
    
    const finalPartName = part_name_snapshot !== undefined ? part_name_snapshot : part_name;
    const finalPartNumber = part_number;
    const finalQty = parseInt(quantity_used !== undefined ? quantity_used : quantity, 10);
    const finalPrice = parseFloat(price_charged !== undefined ? price_charged : unit_cost);

    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // Fetch work order part first to check if it exists and is on this job
    const part = db.prepare('SELECT * FROM work_order_parts WHERE id = ? AND job_id = ? AND user_id = ?').get(partId, jobId, req.user.id);
    if (!part) return res.status(404).json({ error: 'Work order part not found' });
    
    // Update work order part record only. Do not modify inventory_items record or stock levels.
    const stmt = db.prepare(`
      UPDATE work_order_parts
      SET part_name_snapshot = ?, part_number = ?, quantity_used = ?, price_charged = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(
      finalPartName,
      finalPartNumber || null,
      isNaN(finalQty) || finalQty < 0 ? 0 : finalQty,
      isNaN(finalPrice) || finalPrice < 0 ? 0 : finalPrice,
      partId,
      req.user.id
    );
    
    // Fetch and return updated work order part
    const updated = db.prepare(`
      SELECT w.*, COALESCE(w.part_number, i.part_number) AS part_number, i.name as inventory_name, i.category, i.reorder_threshold, i.quantity_on_hand
      FROM work_order_parts w
      LEFT JOIN inventory_items i ON w.inventory_item_id = i.id
      WHERE w.id = ? AND w.user_id = ?
    `).get(partId, req.user.id);
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating work order part:', error);
    res.status(500).json({ error: 'Database error updating work order part' });
  }
});

app.delete('/api/jobs/:jobId/parts/:partId', (req, res) => {
  try {
    const { jobId, partId } = req.params;
    
    // Fetch work order part first to check if it exists and linked to inventory
    const part = db.prepare('SELECT * FROM work_order_parts WHERE id = ? AND job_id = ? AND user_id = ?').get(partId, jobId, req.user.id);
    if (!part) return res.status(404).json({ error: 'Work order part not found' });
    
    if (part.inventory_item_id) {
      // Restock
      db.prepare('UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ? WHERE id = ? AND user_id = ?')
        .run(part.quantity_used, part.inventory_item_id, req.user.id);
    }
    
    db.prepare('DELETE FROM work_order_parts WHERE id = ? AND user_id = ?').run(partId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order part:', error);
    res.status(500).json({ error: 'Database error deleting work order part' });
  }
});

// --- SERVICES ENDPOINTS ---
app.get('/api/services', (req, res) => {
  try {
    let rows = db.prepare('SELECT * FROM services WHERE user_id = ? ORDER BY name ASC').all(req.user.id);
    if (rows.length === 0) {
      // Seed default services for this user
      const defaultServices = [
        ['Standard Oil Change', 45.00, 0.5],
        ['Synthetic Oil Change', 65.00, 0.5],
        ['AC System Check', 89.00, 1.0],
        ['Diagnostic Check (Check Engine Light)', 125.00, 1.0],
        ['Smog Check / Emissions Test', 69.95, 0.5],
        ['Tire Rotation', 25.00, 0.5],
        ['Brake Inspection', 29.95, 0.5],
        ['Battery Test & Charge', 20.00, 0.5],
        ['Wheel Alignment Check', 99.00, 1.0],
        ['Coolant Flush', 120.00, 1.0],
        ['Transmission Fluid Service', 150.00, 1.5],
        ['Multi-Point Inspection', 49.00, 0.5]
      ];
      const insertStmt = db.prepare('INSERT INTO services (name, base_price, included_hours, user_id) VALUES (?, ?, ?, ?)');
      for (const [name, price, hours] of defaultServices) {
        insertStmt.run(name, price, hours, req.user.id);
      }
      rows = db.prepare('SELECT * FROM services WHERE user_id = ? ORDER BY name ASC').all(req.user.id);
    }
    res.json(rows);
  } catch (error) {
    console.error('Error fetching/seeding services:', error);
    res.status(500).json({ error: 'Database error fetching services' });
  }
});

app.post('/api/services', (req, res) => {
  try {
    const { name, base_price, included_hours } = req.body;
    if (!name) return res.status(400).json({ error: 'Service name is required' });
    
    const price = parseFloat(base_price);
    const finalPrice = isNaN(price) || price < 0 ? 0 : price;
    const hours = included_hours !== undefined && included_hours !== null && included_hours !== '' ? parseFloat(included_hours) : null;
    const finalHours = hours !== null && (isNaN(hours) || hours < 0) ? 0 : hours;

    const stmt = db.prepare(`
      INSERT INTO services (name, base_price, included_hours, user_id)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(name, finalPrice, finalHours, req.user.id);
    const created = db.prepare('SELECT * FROM services WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
    res.json(created);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Database error creating service' });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, base_price, included_hours } = req.body;
    if (!name) return res.status(400).json({ error: 'Service name is required' });
    
    const price = parseFloat(base_price);
    const finalPrice = isNaN(price) || price < 0 ? 0 : price;
    const hours = included_hours !== undefined && included_hours !== null && included_hours !== '' ? parseFloat(included_hours) : null;
    const finalHours = hours !== null && (isNaN(hours) || hours < 0) ? 0 : hours;

    const stmt = db.prepare(`
      UPDATE services
      SET name = ?, base_price = ?, included_hours = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(name, finalPrice, finalHours, id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Service not found' });
    
    const updated = db.prepare('SELECT * FROM services WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Database error updating service' });
  }
});

app.delete('/api/services/:id', (req, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM services WHERE id = ? AND user_id = ?').run(id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Service not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Database error deleting service' });
  }
});

// --- WORK ORDER SERVICES (JUNCTION) ENDPOINTS ---
app.get('/api/jobs/:jobId/services', (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const rows = db.prepare('SELECT * FROM job_services WHERE job_id = ? AND user_id = ?').all(jobId, req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching job services:', error);
    res.status(500).json({ error: 'Database error fetching job services' });
  }
});

app.post('/api/jobs/:jobId/services', (req, res) => {
  try {
    const { jobId } = req.params;
    const { service_id, service_name_snapshot, base_price_charged, additional_hours } = req.body;
    
    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    if (!service_name_snapshot) return res.status(400).json({ error: 'Service name is required' });
    
    const basePrice = parseFloat(base_price_charged);
    const finalBasePrice = isNaN(basePrice) || basePrice < 0 ? 0 : basePrice;
    
    const addHours = additional_hours ? parseFloat(additional_hours) : 0;
    const finalAddHours = isNaN(addHours) || addHours < 0 ? 0 : addHours;
    
    // Get default labor rate
    let laborRate = 0;
    const settings = db.prepare('SELECT default_labor_rate FROM shop_settings WHERE user_id = ?').get(req.user.id);
    if (settings) {
      laborRate = settings.default_labor_rate || 0;
    }
    
    const addHoursCost = finalAddHours * laborRate;
    
    const stmt = db.prepare(`
      INSERT INTO job_services (job_id, service_id, service_name_snapshot, base_price_charged, additional_hours, additional_hours_cost, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(jobId, service_id || null, service_name_snapshot, finalBasePrice, finalAddHours, addHoursCost, req.user.id);
    
    const rows = db.prepare('SELECT * FROM job_services WHERE job_id = ? AND user_id = ?').all(jobId, req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error adding job service:', error);
    res.status(500).json({ error: 'Database error adding job service' });
  }
});

app.put('/api/jobs/:jobId/services/:id', (req, res) => {
  try {
    const { jobId, id } = req.params;
    const { service_name_snapshot, base_price_charged, additional_hours } = req.body;
    
    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const js = db.prepare('SELECT * FROM job_services WHERE id = ? AND job_id = ? AND user_id = ?').get(id, jobId, req.user.id);
    if (!js) return res.status(404).json({ error: 'Job service not found' });
    
    const name = service_name_snapshot !== undefined ? service_name_snapshot : js.service_name_snapshot;
    const basePrice = base_price_charged !== undefined ? parseFloat(base_price_charged) : js.base_price_charged;
    const finalBasePrice = isNaN(basePrice) || basePrice < 0 ? 0 : basePrice;
    
    const addHours = additional_hours !== undefined ? parseFloat(additional_hours) : js.additional_hours;
    const finalAddHours = isNaN(addHours) || addHours < 0 ? 0 : addHours;
    
    // Recalculate additional hours cost
    let laborRate = 0;
    const settings = db.prepare('SELECT default_labor_rate FROM shop_settings WHERE user_id = ?').get(req.user.id);
    if (settings) {
      laborRate = settings.default_labor_rate || 0;
    }
    
    const addHoursCost = finalAddHours * laborRate;
    
    const stmt = db.prepare(`
      UPDATE job_services
      SET service_name_snapshot = ?, base_price_charged = ?, additional_hours = ?, additional_hours_cost = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(name, finalBasePrice, finalAddHours, addHoursCost, id, req.user.id);
    
    const rows = db.prepare('SELECT * FROM job_services WHERE job_id = ? AND user_id = ?').all(jobId, req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error updating job service:', error);
    res.status(500).json({ error: 'Database error updating job service' });
  }
});

app.delete('/api/jobs/:jobId/services/:id', (req, res) => {
  try {
    const { jobId, id } = req.params;
    
    // Verify job ownership
    const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const info = db.prepare('DELETE FROM job_services WHERE id = ? AND job_id = ? AND user_id = ?').run(id, jobId, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Job service not found' });
    
    const rows = db.prepare('SELECT * FROM job_services WHERE job_id = ? AND user_id = ?').all(jobId, req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error deleting job service:', error);
    res.status(500).json({ error: 'Database error deleting job service' });
  }
});

// --- RECEIPTS ARCHIVE ---
app.post('/api/receipts', (req, res) => {
  try {
    const { photo_data, supplier_name, invoice_date, linked_import_summary, notes } = req.body;
    if (!photo_data) {
      return res.status(400).json({ error: 'Receipt photo data is required' });
    }

    // Ensure uploads/receipts folder exists
    const receiptsDir = path.join(__dirname, 'uploads', 'receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    let savedPath = '';
    try {
      const filename = `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
      const fullPath = path.join(receiptsDir, filename);
      // Strip base64 header if present
      let rawBase64 = photo_data;
      if (photo_data.includes(';base64,')) {
        rawBase64 = photo_data.split(';base64,')[1];
      }
      fs.writeFileSync(fullPath, Buffer.from(rawBase64, 'base64'));
      savedPath = `/uploads/receipts/${filename}`;
    } catch (err) {
      console.error('Failed to write receipt image to disk:', err);
    }

    const stmt = db.prepare(`
      INSERT INTO receipts (user_id, file_path, photo_data, supplier_name, invoice_date, linked_import_summary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(req.user.id, savedPath, photo_data, supplier_name || null, invoice_date || null, linked_import_summary || null, notes || null);
    const inserted = db.prepare('SELECT id, user_id, file_path, photo_data, uploaded_at, supplier_name, invoice_date, linked_import_summary, notes FROM receipts WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
    res.json(inserted);
  } catch (error) {
    console.error('Error adding receipt:', error);
    res.status(500).json({ error: 'Database error adding receipt' });
  }
});

app.get('/api/receipts', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, user_id, file_path, photo_data, uploaded_at, supplier_name, invoice_date, linked_import_summary, notes FROM receipts WHERE user_id = ? ORDER BY uploaded_at DESC');
    const rows = stmt.all(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Database error fetching receipts' });
  }
});

app.put('/api/receipts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_name, invoice_date, notes, linked_import_summary } = req.body;
    const stmt = db.prepare(`
      UPDATE receipts 
      SET supplier_name = ?, invoice_date = ?, notes = ?, linked_import_summary = ?
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(supplier_name || null, invoice_date || null, notes || null, linked_import_summary || null, id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Receipt not found' });
    const updated = db.prepare('SELECT id, user_id, file_path, photo_data, uploaded_at, supplier_name, invoice_date, linked_import_summary, notes FROM receipts WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Database error updating receipt' });
  }
});

app.delete('/api/receipts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM receipts WHERE id = ? AND user_id = ?').run(id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Database error deleting receipt' });
  }
});

// --- EMAIL CENTER ---

// Helper function to render templates with variables
function renderTemplate(text, variables) {
  if (!text) return '';
  let rendered = text;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, val || '');
  }
  return rendered;
}

// GET /api/emails: Get sent logs, newest first, filterable by search query or date range
app.get('/api/emails', (req, res) => {
  try {
    const { search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    let query = `
      SELECT e.*, c.name as customer_name
      FROM emails_sent e
      LEFT JOIN customers c ON e.to_customer_id = c.id
      WHERE e.user_id = ?
    `;
    const params = [req.user.id];
    
    if (search) {
      query += ` AND (e.to_email LIKE ? OR e.subject LIKE ? OR e.body LIKE ? OR c.name LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }
    
    if (startDate) {
      query += ` AND e.sent_at >= ?`;
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      query += ` AND e.sent_at <= ?`;
      params.push(`${endDate} 23:59:59`);
    }
    
    query += ` ORDER BY e.sent_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), offset);
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ error: 'Database error fetching sent emails' });
  }
});

// GET /api/email-templates: Get templates for the user. Lazy seed defaults on first query.
app.get('/api/email-templates', (req, res) => {
  try {
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM email_templates WHERE user_id = ?');
    const { count } = checkStmt.get(req.user.id);
    
    if (count === 0) {
      console.log(`[EMAIL] Seeding default email templates for user ${req.user.id}`);
      const seedStmt = db.prepare(`
        INSERT INTO email_templates (user_id, name, subject, body)
        VALUES (?, ?, ?, ?)
      `);
      
      const invoiceBody = `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; margin-top: 0;">Invoice Ready</h2>
  <p>Hello <strong>{{customer_name}}</strong>,</p>
  <p>We are pleased to inform you that the service on your vehicle (<strong>{{vehicle}}</strong>) has been completed, and your invoice is ready at <strong>{{shop_name}}</strong>.</p>
  <p>Please contact us or visit our shop to arrange for pickup and payment.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">Sent by {{shop_name}} • Professional Auto Service</p>
</div>`;

      const reminderBody = `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; margin-top: 0;">Appointment Reminder</h2>
  <p>Hello <strong>{{customer_name}}</strong>,</p>
  <p>This is a friendly reminder that you have an upcoming service appointment scheduled with us.</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 6px;">
    <p style="margin: 4px 0;"><strong>Vehicle:</strong> {{vehicle}}</p>
    <p style="margin: 4px 0;"><strong>Date & Time:</strong> {{appointment_date}}</p>
    <p style="margin: 4px 0;"><strong>Location:</strong> {{shop_name}}</p>
  </div>
  <p>If you have any questions or need to reschedule, please give us a call at your earliest convenience.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">Thank you for choosing {{shop_name}}!</p>
</div>`;

      seedStmt.run(req.user.id, 'Invoice Ready', 'Invoice Ready - {{shop_name}}', invoiceBody);
      seedStmt.run(req.user.id, 'Appointment Reminder', 'Upcoming Service Appointment - {{shop_name}}', reminderBody);
    }
    
    const selectStmt = db.prepare('SELECT * FROM email_templates WHERE user_id = ? ORDER BY name ASC');
    const rows = selectStmt.all(req.user.id);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Database error fetching email templates' });
  }
});

// POST /api/email-templates: Create template
app.post('/api/email-templates', (req, res) => {
  try {
    const { name, subject, body } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Name, subject, and body are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO email_templates (user_id, name, subject, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const info = stmt.run(req.user.id, name, subject, body);
    const inserted = db.prepare('SELECT * FROM email_templates WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Database error creating email template' });
  }
});

// PUT /api/email-templates/:id: Update template
app.put('/api/email-templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Name, subject, and body are required' });
    }
    const stmt = db.prepare(`
      UPDATE email_templates
      SET name = ?, subject = ?, body = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    const info = stmt.run(name, subject, body, id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Template not found' });
    const updated = db.prepare('SELECT * FROM email_templates WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Database error updating email template' });
  }
});

// DELETE /api/email-templates/:id: Delete template
app.delete('/api/email-templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM email_templates WHERE id = ? AND user_id = ?').run(id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Database error deleting email template' });
  }
});

// POST /api/emails/send: Send email
app.post('/api/emails/send', async (req, res) => {
  const { to, customer_id, template_id, subject: customSubject, body: customBody } = req.body;
  
  if (!to) {
    return res.status(400).json({ error: 'Recipient email (to) is required' });
  }

  let finalSubject = customSubject || '';
  let finalBody = customBody || '';
  
  try {
    // 1. Gather variables
    const variables = {
      customer_name: 'Valued Customer',
      vehicle: 'your vehicle',
      shop_name: 'Our Auto Shop',
      appointment_date: 'your scheduled appointment time'
    };

    // Load customer info if available
    if (customer_id) {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(customer_id, req.user.id);
      if (customer) {
        variables.customer_name = customer.name;
      }
      
      const vehicle = db.prepare('SELECT * FROM customer_vehicles WHERE customer_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1').get(customer_id, req.user.id);
      if (vehicle) {
        variables.vehicle = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      }
      
      const appt = db.prepare('SELECT * FROM appointments WHERE customer_id = ? AND user_id = ? ORDER BY date DESC, time DESC LIMIT 1').get(customer_id, req.user.id);
      if (appt) {
        variables.appointment_date = `${appt.date} at ${appt.time}`;
      }
    }
    
    // Load shop settings
    const shop = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(req.user.id);
    if (shop && shop.shop_name) {
      variables.shop_name = shop.shop_name;
    }

    // 2. Resolve template subject & body
    if (template_id) {
      const template = db.prepare('SELECT * FROM email_templates WHERE id = ? AND user_id = ?').get(template_id, req.user.id);
      if (!template) {
        return res.status(404).json({ error: 'Email template not found' });
      }
      finalSubject = renderTemplate(template.subject, variables);
      finalBody = renderTemplate(template.body, variables);
    } else {
      finalSubject = renderTemplate(finalSubject, variables);
      finalBody = renderTemplate(finalBody, variables);
    }

    if (!finalSubject || !finalBody) {
      return res.status(400).json({ error: 'Subject and Body are required to send an email' });
    }

    // 3. Send email via Resend SDK
    let status = 'sent';
    try {
      const { sendEmail } = require('./email');
      await sendEmail({ to, subject: finalSubject, html: finalBody });
    } catch (sendErr) {
      console.error('[EMAIL] Resend delivery failed:', sendErr);
      status = 'failed';
    }

    // 4. Log to DB regardless of status
    const insertLogStmt = db.prepare(`
      INSERT INTO emails_sent (user_id, to_email, to_customer_id, subject, body, template_id, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const info = insertLogStmt.run(
      req.user.id,
      to,
      customer_id || null,
      finalSubject,
      finalBody,
      template_id || null,
      status
    );

    const loggedEmail = db.prepare('SELECT * FROM emails_sent WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);

    if (status === 'failed') {
      return res.status(500).json({ 
        error: 'Failed to deliver email. Please check your RESEND_API_KEY environment variable.', 
        logged: loggedEmail 
      });
    }

    res.json({ success: true, email: loggedEmail });

  } catch (error) {
    console.error('Error in send email endpoint:', error);
    res.status(500).json({ error: 'Database or server error sending email' });
  }
});

// --- CHAT ASSISTANT ---
const chatRoute = require('./chat-route');
app.use('/api/chat', chatRoute);

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
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.mp4') || filePath.toLowerCase().endsWith('.mp4')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
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
