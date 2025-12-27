const db = require('../database/db');

class Stakeholder {
  // Calculate risk score based on power, influence, and engagement
  static calculateRiskScore(power, influence, engagementStatus) {
    // Risk = (Power + Influence) / 2
    // Multiply by engagement factor:
    // - resistant: 2.0 (doubles the risk)
    // - neutral: 1.5 (increases risk by 50%)
    // - supportive: 0.5 (halves the risk)

    const baseScore = (power + influence) / 2;

    const engagementFactor = {
      resistant: 2.0,
      neutral: 1.5,
      supportive: 0.5
    };

    const factor = engagementFactor[engagementStatus] || 1.5;
    return (baseScore * factor).toFixed(2);
  }

  // Create a new stakeholder
  static create(projectId, data) {
    const { name, role, power, influence, engagement_status, owner, preferred_channel, notes } = data;

    const riskScore = this.calculateRiskScore(power, influence, engagement_status);

    const stmt = db.prepare(`
      INSERT INTO stakeholders
      (project_id, name, role, power, influence, engagement_status, owner, preferred_channel, notes, risk_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      projectId, name, role, power, influence,
      engagement_status, owner, preferred_channel, notes, riskScore
    );

    return this.findById(result.lastInsertRowid);
  }

  // Get all stakeholders for a project
  static findByProject(projectId) {
    const stmt = db.prepare('SELECT * FROM stakeholders WHERE project_id = ? ORDER BY risk_score DESC');
    return stmt.all(projectId);
  }

  // Get stakeholder by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM stakeholders WHERE id = ?');
    return stmt.get(id);
  }

  // Update stakeholder
  static update(id, data) {
    const { name, role, power, influence, engagement_status, owner, preferred_channel, notes } = data;

    const riskScore = this.calculateRiskScore(power, influence, engagement_status);

    const stmt = db.prepare(`
      UPDATE stakeholders
      SET name = ?, role = ?, power = ?, influence = ?,
          engagement_status = ?, owner = ?, preferred_channel = ?,
          notes = ?, risk_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name, role, power, influence, engagement_status,
      owner, preferred_channel, notes, riskScore, id
    );

    return this.findById(id);
  }

  // Delete stakeholder
  static delete(id) {
    const stmt = db.prepare('DELETE FROM stakeholders WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get stakeholder with interactions
  static findByIdWithInteractions(id) {
    const stakeholder = this.findById(id);
    if (!stakeholder) return null;

    const interactions = db.prepare(
      'SELECT * FROM interactions WHERE stakeholder_id = ? ORDER BY date DESC'
    ).all(id);

    return { ...stakeholder, interactions };
  }

  // Get high-risk stakeholders (risk score > 5)
  static findHighRisk(projectId) {
    const stmt = db.prepare(`
      SELECT * FROM stakeholders
      WHERE project_id = ? AND risk_score > 5
      ORDER BY risk_score DESC
    `);
    return stmt.all(projectId);
  }
}

module.exports = Stakeholder;
