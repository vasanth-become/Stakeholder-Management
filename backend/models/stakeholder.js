const db = require('../database/db');

class Stakeholder {
  // Calculate risk score based on power, influence, engagement, and update gap
  // Score out of 20:
  // - power (1-5)
  // - influence (1-5)
  // - engagement penalty: supportive=0, neutral=+2, resistant=+4
  // - update gap penalty: +3 if no interaction in last 14 days
  static calculateRiskScore(power, influence, engagementStatus, stakeholderId = null) {
    let score = power + influence;

    // Add engagement penalty
    const engagementPenalty = {
      supportive: 0,
      neutral: 2,
      resistant: 4
    };
    score += engagementPenalty[engagementStatus] || 2;

    // Add update gap penalty if stakeholder ID is provided
    if (stakeholderId) {
      const lastInteraction = db.prepare(`
        SELECT MAX(date) as last_date
        FROM interactions
        WHERE stakeholder_id = ?
      `).get(stakeholderId);

      if (lastInteraction && lastInteraction.last_date) {
        const daysSinceUpdate = this.getDaysSince(lastInteraction.last_date);
        if (daysSinceUpdate > 14) {
          score += 3;
        }
      } else {
        // No interactions ever recorded - add penalty
        score += 3;
      }
    }

    return Math.min(score, 20); // Cap at 20
  }

  // Helper function to calculate days since a date
  static getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

    // Recalculate risk score with update gap check
    const riskScore = this.calculateRiskScore(power, influence, engagement_status, id);

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

  // Get high-risk stakeholders (risk score >= 12 out of 20)
  static findHighRisk(projectId) {
    const stmt = db.prepare(`
      SELECT * FROM stakeholders
      WHERE project_id = ? AND risk_score >= 12
      ORDER BY risk_score DESC
    `);
    return stmt.all(projectId);
  }

  // Get all stakeholders across all projects
  static findAll() {
    const stmt = db.prepare(`
      SELECT s.*, p.name as project_name
      FROM stakeholders s
      JOIN projects p ON s.project_id = p.id
      ORDER BY s.name ASC
    `);
    return stmt.all();
  }

  // Get all high-risk stakeholders across all projects
  static findAllHighRisk() {
    const stmt = db.prepare(`
      SELECT s.*, p.name as project_name
      FROM stakeholders s
      JOIN projects p ON s.project_id = p.id
      WHERE s.risk_score >= 12
      ORDER BY s.risk_score DESC
    `);
    return stmt.all();
  }

  // Check if a stakeholder is at risk
  static isAtRisk(riskScore) {
    return riskScore >= 12;
  }

  // Recalculate risk score for a stakeholder (useful after logging interactions)
  static recalculateRisk(stakeholderId) {
    const stakeholder = this.findById(stakeholderId);
    if (!stakeholder) return null;

    const newRiskScore = this.calculateRiskScore(
      stakeholder.power,
      stakeholder.influence,
      stakeholder.engagement_status,
      stakeholderId
    );

    const stmt = db.prepare(`
      UPDATE stakeholders
      SET risk_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(newRiskScore, stakeholderId);
    return this.findById(stakeholderId);
  }
}

module.exports = Stakeholder;
