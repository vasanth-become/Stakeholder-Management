const Database = require('better-sqlite3');
const path = require('path');

// Create database connection
const db = new Database(path.join(__dirname, 'stakeholder_radar.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stakeholders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stakeholders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT,
      power INTEGER CHECK(power >= 1 AND power <= 5),
      influence INTEGER CHECK(influence >= 1 AND influence <= 5),
      engagement_status TEXT CHECK(engagement_status IN ('supportive', 'neutral', 'resistant')),
      owner TEXT,
      preferred_channel TEXT,
      notes TEXT,
      risk_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Interactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stakeholder_id INTEGER NOT NULL,
      interaction_type TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      summary TEXT,
      outcome TEXT,
      follow_up_needed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully');
}

// Initialize on startup
initializeDatabase();

module.exports = db;
