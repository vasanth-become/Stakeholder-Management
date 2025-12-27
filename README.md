# Stakeholder Radar

A full-stack web application for managing stakeholder relationships with automated risk assessment and interaction tracking.

## Overview

Stakeholder Radar helps project managers track and analyze stakeholder engagement through:
- **Risk Scoring**: Automated calculation based on power, influence, and engagement status
- **Interaction Tracking**: Log meetings, calls, and communications
- **Visual Dashboard**: Quick view of high-risk stakeholders across all projects
- **Project Management**: Organize stakeholders by project

## Tech Stack

**Backend:**
- Node.js + Express
- SQLite (better-sqlite3)
- REST API

**Frontend:**
- React 18
- React Router v6
- Modern CSS with gradients

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

Backend runs on http://localhost:3001

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on http://localhost:3000

## Features

### Dashboard
- List of all projects
- Top 5 high-risk stakeholders (sorted by risk score)
- Quick project creation

### Project Management
- View all stakeholders in a project
- Add new stakeholders with detailed attributes
- Table view with sortable risk scores

### Stakeholder Details
- Complete profile with power and influence ratings
- Visual risk score indicator (color-coded)
- Full interaction history timeline
- Log new interactions with follow-up tracking

## Risk Calculation Formula

```
base_score = (power + influence) / 2

engagement_multipliers:
- Resistant:  2.0x  (high risk)
- Neutral:    1.5x  (medium risk)
- Supportive: 0.5x  (low risk)

risk_score = base_score × engagement_multiplier
```

### Examples

- **CEO, Resistant**: Power 5, Influence 5 → (5+5)/2 × 2.0 = **10** (Critical)
- **Manager, Neutral**: Power 3, Influence 3 → (3+3)/2 × 1.5 = **4.5** (Monitor)
- **Analyst, Supportive**: Power 2, Influence 2 → (2+2)/2 × 0.5 = **1** (Stable)

## API Endpoints

### Projects
- `GET /api/projects` - List all
- `POST /api/projects` - Create
- `GET /api/projects/:id` - Get one
- `PUT /api/projects/:id` - Update
- `DELETE /api/projects/:id` - Delete

### Stakeholders
- `GET /api/stakeholders/project/:projectId` - List by project
- `GET /api/stakeholders/project/:projectId/high-risk` - High-risk only
- `POST /api/stakeholders` - Create
- `PUT /api/stakeholders/:id` - Update
- `DELETE /api/stakeholders/:id` - Delete
- `POST /api/stakeholders/calculate-risk` - Calculate risk score

### Interactions
- `GET /api/interactions/stakeholder/:stakeholderId` - List all
- `POST /api/interactions` - Log interaction
- `GET /api/interactions/follow-up` - Get pending follow-ups
- `PUT /api/interactions/:id` - Update
- `DELETE /api/interactions/:id` - Delete

## Project Structure

```
stakeholder-radar/
├── backend/
│   ├── database/
│   │   └── db.js              # SQLite setup
│   ├── models/
│   │   ├── project.js         # Project model
│   │   ├── stakeholder.js     # Stakeholder + risk calc
│   │   └── interaction.js     # Interaction model
│   ├── routes/
│   │   ├── projects.js        # Project endpoints
│   │   ├── stakeholders.js    # Stakeholder endpoints
│   │   └── interactions.js    # Interaction endpoints
│   └── server.js              # Express app
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navigation.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── ProjectPage.js
│   │   │   └── StakeholderPage.js
│   │   ├── services/
│   │   │   └── api.js         # Backend API calls
│   │   ├── App.js
│   │   └── index.js
│   └── public/
│       └── index.html
```

## Development Notes

- Backend uses SQLite with foreign key constraints
- Database auto-initializes on first run
- Risk scores are automatically recalculated on stakeholder updates
- Frontend includes form validation
- Responsive design works on desktop and tablet

## License

MIT
