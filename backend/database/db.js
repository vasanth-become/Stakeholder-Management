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

  // Stakeholder enrichments table - tracks enrichment history
  db.exec(`
    CREATE TABLE IF NOT EXISTS stakeholder_enrichments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stakeholder_id INTEGER NOT NULL,
      suggestions_data TEXT NOT NULL,
      accepted_fields TEXT,
      rejected_fields TEXT,
      enriched_by TEXT,
      enriched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE
    )
  `);

  // Run migrations for AI-generated interactions
  try {
    // Check if columns already exist
    const interactionsTableInfo = db.prepare("PRAGMA table_info(interactions)").all();
    const interactionColumnNames = interactionsTableInfo.map(col => col.name);

    if (!interactionColumnNames.includes('concerns')) {
      db.exec(`ALTER TABLE interactions ADD COLUMN concerns TEXT`);
    }
    if (!interactionColumnNames.includes('action_items')) {
      db.exec(`ALTER TABLE interactions ADD COLUMN action_items TEXT`);
    }
    if (!interactionColumnNames.includes('owner')) {
      db.exec(`ALTER TABLE interactions ADD COLUMN owner TEXT`);
    }
    if (!interactionColumnNames.includes('ai_confidence_score')) {
      db.exec(`ALTER TABLE interactions ADD COLUMN ai_confidence_score REAL`);
    }
    if (!interactionColumnNames.includes('ai_generated')) {
      db.exec(`ALTER TABLE interactions ADD COLUMN ai_generated BOOLEAN DEFAULT 0`);
    }
    if (!interactionColumnNames.includes('stakeholders_involved')) {
      db.exec(`ALTER TABLE interactions ADD COLUMN stakeholders_involved TEXT`);
    }

    // Create indexes if they don't exist
    db.exec(`CREATE INDEX IF NOT EXISTS idx_interactions_ai_generated ON interactions(ai_generated)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC)`);
  } catch (error) {
    // Columns likely already exist, continue
    console.log('[Database] AI interaction columns migration check completed');
  }

  // Run migrations for profile enrichment fields
  try {
    const stakeholdersTableInfo = db.prepare("PRAGMA table_info(stakeholders)").all();
    const stakeholderColumnNames = stakeholdersTableInfo.map(col => col.name);

    // Add enrichment-related columns to stakeholders table
    if (!stakeholderColumnNames.includes('email')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN email TEXT`);
    }
    if (!stakeholderColumnNames.includes('linkedin_url')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN linkedin_url TEXT`);
    }
    if (!stakeholderColumnNames.includes('company')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN company TEXT`);
    }
    if (!stakeholderColumnNames.includes('location')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN location TEXT`);
    }
    if (!stakeholderColumnNames.includes('bio')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN bio TEXT`);
    }
    if (!stakeholderColumnNames.includes('department')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN department TEXT`);
    }
    if (!stakeholderColumnNames.includes('seniority')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN seniority TEXT`);
    }
    if (!stakeholderColumnNames.includes('timezone')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN timezone TEXT`);
    }
    if (!stakeholderColumnNames.includes('languages')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN languages TEXT`);
    }
    if (!stakeholderColumnNames.includes('industry')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN industry TEXT`);
    }
    if (!stakeholderColumnNames.includes('company_size')) {
      db.exec(`ALTER TABLE stakeholders ADD COLUMN company_size TEXT`);
    }

    // Create index for enrichment lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stakeholders_email ON stakeholders(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stakeholder_enrichments_stakeholder ON stakeholder_enrichments(stakeholder_id)`);

    console.log('[Database] Profile enrichment columns migration completed');
  } catch (error) {
    console.log('[Database] Profile enrichment columns migration check completed');
  }

  console.log('Database initialized successfully');
}

// Initialize on startup
initializeDatabase();

module.exports = db;
