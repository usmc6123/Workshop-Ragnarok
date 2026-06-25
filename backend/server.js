/**
 * Workshop: Ragnarök - Homelab Backend Server
 * Coordinates vehicle index querying (SQLite) and manual content fetching (cheerio parsing)
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

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

// Initialize SQLite database
let db;
try {
  db = new Database(DB_PATH);
  console.log(`Connected to SQLite database at ${DB_PATH}`);
  
  // Create garage table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS garage (
      garageId INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER,
      nickname TEXT,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS garage_vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS service_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER REFERENCES garage_vehicles(id),
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      vehicle_year TEXT,
      vehicle_make TEXT,
      vehicle_model TEXT,
      vehicle_vin TEXT,
      vehicle_mileage_in INTEGER,
      description TEXT,
      notes TEXT,
      status TEXT DEFAULT 'Pending',
      estimated_completion TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS job_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id),
      part_name TEXT,
      part_number TEXT,
      quantity INTEGER DEFAULT 1,
      unit_cost REAL,
      notes TEXT
    )
  `);
  console.log('Verified database schemas');
} catch (err) {
  console.error('Failed to initialize SQLite database:', err);
}

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
      conditions.push('(make LIKE ? OR model LIKE ? OR year LIKE ? OR engine LIKE ?)');
      const searchPattern = `%${q}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
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
    // Category pages typically have ul/ol lists containing links
    const hasCategoryLinks = $content.find('ul li a, ol li a').length > 0;

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
      // Content page block parsing
      const blocks = [];

      $content.find('h1, h2, h3, h4, p, img, ol, ul').each((idx, el) => {
        const $el = $(el);

        // Avoid double parsing nested items
        if ($el.closest('ol, ul').length > 0 && !$el.is('ol, ul')) {
          return;
        }
        if ($el.closest('p').length > 0 && !$el.is('p')) {
          return;
        }

        const tagName = el.name.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
          const text = $el.text().trim();
          if (text) {
            blocks.push({ type: 'heading', text });
          }
        } else if (tagName === 'p') {
          const text = $el.text().trim();
          if (text) {
            blocks.push({ type: 'text', text });
          }
        } else if (tagName === 'img') {
          const src = $el.attr('src');
          if (src) {
            blocks.push({ type: 'image', src });
          }
        } else if (['ol', 'ul'].includes(tagName)) {
          const items = [];
          $el.find('li').each((i, liEl) => {
            const itemText = $(liEl).text().trim();
            if (itemText) {
              items.push(itemText);
            }
          });
          if (items.length > 0) {
            blocks.push({ type: 'steps', items });
          }
        }
      });

      // Fallback text if empty
      if (blocks.length === 0) {
        const text = $content.text().trim();
        if (text) {
          blocks.push({ type: 'text', text });
        }
      }

      return res.json({
        pageType: 'content',
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
// AUTO SHOP MANAGEMENT SYSTEM API ENDPOINTS
// ==========================================

// --- DATABASE STATS ---
app.get('/api/stats', (req, res) => {
  try {
    let totalManuals = 300000;
    if (isVehiclesTableReady()) {
      const row = db.prepare('SELECT count(*) as count FROM vehicles').get();
      totalManuals = row.count || 300000;
    }
    
    let totalGarageVehicles = 0;
    try {
      const row = db.prepare('SELECT count(*) as count FROM garage_vehicles').get();
      totalGarageVehicles = row.count || 0;
    } catch (e) {
      console.error(e);
    }

    let totalJobs = 0;
    try {
      const row = db.prepare('SELECT count(*) as count FROM jobs').get();
      totalJobs = row.count || 0;
    } catch (e) {
      console.error(e);
    }

    res.json({
      totalManuals,
      totalGarageVehicles,
      totalJobs
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Database error fetching stats' });
  }
});

// --- GARAGE VEHICLES ---
app.get('/api/garage-vehicles', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM garage_vehicles ORDER BY created_at DESC');
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching garage vehicles:', error);
    res.status(500).json({ error: 'Database error fetching garage vehicles' });
  }
});

app.post('/api/garage-vehicles', (req, res) => {
  try {
    const { year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes } = req.body;
    const stmt = db.prepare(`
      INSERT INTO garage_vehicles (year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(year, make, model, engine, vin, color, purchase_date, purchase_mileage || 0, current_mileage || 0, notes);
    const inserted = db.prepare('SELECT * FROM garage_vehicles WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (error) {
    console.error('Error creating garage vehicle:', error);
    res.status(500).json({ error: 'Database error creating garage vehicle' });
  }
});

app.put('/api/garage-vehicles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { year, make, model, engine, vin, color, purchase_date, purchase_mileage, current_mileage, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE garage_vehicles
      SET year = ?, make = ?, model = ?, engine = ?, vin = ?, color = ?, purchase_date = ?, purchase_mileage = ?, current_mileage = ?, notes = ?
      WHERE id = ?
    `);
    const info = stmt.run(year, make, model, engine, vin, color, purchase_date, purchase_mileage || 0, current_mileage || 0, notes, id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Garage vehicle not found' });
    }
    const updated = db.prepare('SELECT * FROM garage_vehicles WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating garage vehicle:', error);
    res.status(500).json({ error: 'Database error updating garage vehicle' });
  }
});

app.delete('/api/garage-vehicles/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM service_history WHERE vehicle_id = ?').run(id);
    const stmt = db.prepare('DELETE FROM garage_vehicles WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Garage vehicle not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting garage vehicle:', error);
    res.status(500).json({ error: 'Database error deleting garage vehicle' });
  }
});

// --- SERVICE HISTORY ---
app.get('/api/service-history/:vehicleId', (req, res) => {
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
    const { vehicle_id, date, mileage, description, parts_used, cost, technician, notes } = req.body;
    const stmt = db.prepare(`
      INSERT INTO service_history (vehicle_id, date, mileage, description, parts_used, cost, technician, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(vehicle_id, date, mileage || 0, description, parts_used, cost || 0, technician, notes);
    
    if (mileage) {
      db.prepare(`
        UPDATE garage_vehicles
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
    const { vehicle_id, date, mileage, description, parts_used, cost, technician, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE service_history
      SET vehicle_id = ?, date = ?, mileage = ?, description = ?, parts_used = ?, cost = ?, technician = ?, notes = ?
      WHERE id = ?
    `);
    const info = stmt.run(vehicle_id, date, mileage || 0, description, parts_used, cost || 0, technician, notes, id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Service entry not found' });
    }

    if (mileage && vehicle_id) {
      db.prepare(`
        UPDATE garage_vehicles
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
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Service entry not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service entry:', error);
    res.status(500).json({ error: 'Database error deleting service entry' });
  }
});

// --- SHOP JOBS ---
app.get('/api/jobs', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC');
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Database error fetching jobs' });
  }
});

app.post('/api/jobs', (req, res) => {
  try {
    const {
      customer_name, customer_phone, customer_email,
      vehicle_year, vehicle_make, vehicle_model, vehicle_vin, vehicle_mileage_in,
      description, notes, status, estimated_completion
    } = req.body;
    const stmt = db.prepare(`
      INSERT INTO jobs (
        customer_name, customer_phone, customer_email,
        vehicle_year, vehicle_make, vehicle_model, vehicle_vin, vehicle_mileage_in,
        description, notes, status, estimated_completion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      customer_name, customer_phone, customer_email,
      vehicle_year, vehicle_make, vehicle_model, vehicle_vin, vehicle_mileage_in || 0,
      description, notes, status || 'Pending', estimated_completion
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
      customer_name, customer_phone, customer_email,
      vehicle_year, vehicle_make, vehicle_model, vehicle_vin, vehicle_mileage_in,
      description, notes, status, estimated_completion
    } = req.body;
    const stmt = db.prepare(`
      UPDATE jobs
      SET customer_name = ?, customer_phone = ?, customer_email = ?,
          vehicle_year = ?, vehicle_make = ?, vehicle_model = ?, vehicle_vin = ?, vehicle_mileage_in = ?,
          description = ?, notes = ?, status = ?, estimated_completion = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = stmt.run(
      customer_name, customer_phone, customer_email,
      vehicle_year, vehicle_make, vehicle_model, vehicle_vin, vehicle_mileage_in || 0,
      description, notes, status, estimated_completion, id
    );
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
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
    const stmt = db.prepare('DELETE FROM jobs WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
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

app.delete('/api/jobs/:jobId/parts/:partId', (req, res) => {
  try {
    const { partId } = req.params;
    const stmt = db.prepare('DELETE FROM job_parts WHERE id = ?');
    const info = stmt.run(partId);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Job part not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing job part:', error);
    res.status(500).json({ error: 'Database error removing job part' });
  }
});

// Serve React build from the /public folder
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Fallback for SPA routing - all non-API paths resolve to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Front-end client build not found in /public folder. Please ensure the frontend is compiled.');
  }
});

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
