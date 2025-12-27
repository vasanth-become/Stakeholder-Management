const db = require('../database/db');
const Stakeholder = require('./stakeholder');

class Interaction {
  // Log a new interaction
  static create(stakeholderId, data) {
    const { interaction_type, date, summary, outcome, follow_up_needed } = data;

    const stmt = db.prepare(`
      INSERT INTO interactions
      (stakeholder_id, interaction_type, date, summary, outcome, follow_up_needed)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      stakeholderId,
      interaction_type,
      date || new Date().toISOString(),
      summary,
      outcome,
      follow_up_needed ? 1 : 0
    );

    // Recalculate stakeholder risk score after logging interaction
    Stakeholder.recalculateRisk(stakeholderId);

    return this.findById(result.lastInsertRowid);
  }

  // Get all interactions for a stakeholder
  static findByStakeholder(stakeholderId) {
    const stmt = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
      ORDER BY date DESC
    `);
    return stmt.all(stakeholderId);
  }

  // Get interaction by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM interactions WHERE id = ?');
    return stmt.get(id);
  }

  // Update interaction
  static update(id, data) {
    const { interaction_type, date, summary, outcome, follow_up_needed } = data;

    const stmt = db.prepare(`
      UPDATE interactions
      SET interaction_type = ?, date = ?, summary = ?,
          outcome = ?, follow_up_needed = ?
      WHERE id = ?
    `);

    stmt.run(
      interaction_type,
      date,
      summary,
      outcome,
      follow_up_needed ? 1 : 0,
      id
    );

    return this.findById(id);
  }

  // Delete interaction
  static delete(id) {
    const stmt = db.prepare('DELETE FROM interactions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get recent interactions (last 30 days)
  static findRecent(stakeholderId, days = 30) {
    const stmt = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
        AND date >= datetime('now', '-' || ? || ' days')
      ORDER BY date DESC
    `);
    return stmt.all(stakeholderId, days);
  }

  // Get all interactions requiring follow-up
  static findFollowUpNeeded(stakeholderId = null) {
    let stmt;
    if (stakeholderId) {
      stmt = db.prepare(`
        SELECT i.*, s.name as stakeholder_name
        FROM interactions i
        JOIN stakeholders s ON i.stakeholder_id = s.id
        WHERE i.stakeholder_id = ? AND i.follow_up_needed = 1
        ORDER BY i.date DESC
      `);
      return stmt.all(stakeholderId);
    } else {
      stmt = db.prepare(`
        SELECT i.*, s.name as stakeholder_name
        FROM interactions i
        JOIN stakeholders s ON i.stakeholder_id = s.id
        WHERE i.follow_up_needed = 1
        ORDER BY i.date DESC
      `);
      return stmt.all();
    }
  }
}

module.exports = Interaction;
