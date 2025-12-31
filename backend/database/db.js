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

  // OAuth tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('slack', 'google', 'jira')),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_type TEXT DEFAULT 'Bearer',
      expires_at DATETIME,
      scopes TEXT,
      metadata TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, provider)
    )
  `);

  console.log('Database initialized successfully');
}

// Initialize on startup
initializeDatabase();

module.exports = db;
