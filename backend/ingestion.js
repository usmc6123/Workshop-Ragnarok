/**
 * Workshop: Ragnarök - Homelab Database Ingestion Pipeline
 * Rapidly hydrates SQLite vehicle indexes from CHARM / LEMON index datasets.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

require('dotenv').config();

const DB_PATH = process.env.DB_PATH || '/data/db/workshop.db';
const INDEX_JSON_PATH = process.env.INDEX_JSON_PATH || '/data/charm/index.json';

console.log('==================================================');
console.log('🚀 Workshop: Ragnarök - Starting Ingestion Pipeline');
console.log('==================================================');
console.log(`Database target: ${DB_PATH}`);
console.log(`Dataset index source: ${INDEX_JSON_PATH}`);

// 1. Verify index file existence
if (!fs.existsSync(INDEX_JSON_PATH)) {
  console.error(`❌ ERROR: Could not find the index.json file at: ${INDEX_JSON_PATH}`);
  console.log('Please ensure the index file is mounted correctly or configure INDEX_JSON_PATH.');
  process.exit(1);
}

// 2. Ensure DB directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory structure: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// 3. Connect to database and build schema
let db;
try {
  db = new Database(DB_PATH);
} catch (err) {
  console.error('❌ ERROR: Failed to connect to SQLite database:', err);
  process.exit(1);
}

console.log('Building database structures...');
db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY,
    source TEXT,
    make TEXT,
    year TEXT,
    model TEXT,
    engine TEXT,
    uriPath TEXT,
    isComplete INTEGER
  );
  
  CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
  CREATE INDEX IF NOT EXISTS idx_vehicles_make_year ON vehicles(make, year);
`);
console.log('✅ Database schema verified.');

// 4. Read and parse index dataset
console.log('Reading index dataset file... (this may take a few seconds)');
let dataset;
try {
  const rawData = fs.readFileSync(INDEX_JSON_PATH, 'utf8');
  dataset = JSON.parse(rawData);
} catch (err) {
  console.error('❌ ERROR: Failed to read or parse index.json file:', err.message);
  process.exit(1);
}

// Ensure the dataset structure is an array
let records = [];
if (Array.isArray(dataset)) {
  records = dataset;
} else if (typeof dataset === 'object' && dataset !== null) {
  // If structured as an object with key values, map to list
  records = Object.values(dataset);
}

const totalRecords = records.length;
console.log(`Loaded ${totalRecords.toLocaleString()} entries from dataset index file.`);

if (totalRecords === 0) {
  console.log('⚠️ Warning: No records found in index.json to ingest.');
  process.exit(0);
}

// 5. High-Performance Transaction Ingest
console.log('Starting atomic transaction ingest... ⚡');
const startTime = Date.now();

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO vehicles (id, source, make, year, model, engine, uriPath, isComplete)
  VALUES (:id, :source, :make, :year, :model, :engine, :uriPath, :isComplete)
`);

const runIngest = db.transaction((items) => {
  let inserted = 0;
  for (const item of items) {
    // Standardize structure and match sqlite constraints
    const mapped = {
      id: null, // Always null so SQLite auto-assigns it
      source: item.source || 'charm',
      make: item.make || 'Unknown',
      year: Array.isArray(item.years) ? String(item.years[0]) : String(item.year || ''),
      model: item.model || 'Unknown',
      engine: item.engine || 'N/A',
      uriPath: item.uriPath || '',
      isComplete: item.isComplete !== undefined ? (item.isComplete ? 1 : 0) : 1
    };
    
    insertStmt.run(mapped);
    inserted++;
  }
  return inserted;
});

try {
  const resultCount = runIngest(records);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const rate = Math.round(resultCount / parseFloat(durationSec));
  
  console.log('==================================================');
  console.log('🎉 INGESTION PIPELINE COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
  console.log(`✅ Total records written: ${resultCount.toLocaleString()}`);
  console.log(`⏱️ Duration: ${durationSec} seconds`);
  console.log(`⚡ Rate: ${rate.toLocaleString()} records/second`);
  console.log(`📁 Database size: ${(fs.statSync(DB_PATH).size / (1024 * 1024)).toFixed(2)} MB`);
  console.log('==================================================');
} catch (err) {
  console.error('❌ ERROR: Transaction rollback occurred due to ingestion failure:', err);
  process.exit(1);
}
