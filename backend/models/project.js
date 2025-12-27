const db = require('../database/db');

class Project {
  // Create a new project
  static create(name, description, status = 'active') {
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(name, description, status);
    return this.findById(result.lastInsertRowid);
  }

  // Get all projects
  static findAll() {
    const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    return stmt.all();
  }

  // Get project by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id);
  }

  // Update project
  static update(id, name, description, status) {
    const stmt = db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, description, status, id);
    return this.findById(id);
  }

  // Delete project (will cascade delete stakeholders and interactions)
  static delete(id) {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get project with stakeholders
  static findByIdWithStakeholders(id) {
    const project = this.findById(id);
    if (!project) return null;

    const stakeholders = db.prepare(
      'SELECT * FROM stakeholders WHERE project_id = ?'
    ).all(id);

    return { ...project, stakeholders };
  }
}

module.exports = Project;
