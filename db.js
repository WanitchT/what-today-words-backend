const Database = require('better-sqlite3');
const db = new Database('./db.sqlite');

// Create baby table
db.prepare(`
  CREATE TABLE IF NOT EXISTS baby (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )
`).run();

// Create words table
db.prepare(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT,
    date TEXT,
    baby_id INTEGER,
    FOREIGN KEY (baby_id) REFERENCES baby(id)
  )
`).run();

module.exports = db;