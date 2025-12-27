# Stakeholder Radar - Backend API

A Node.js/Express backend for managing stakeholder relationships with risk assessment.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server runs on http://localhost:3001

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `GET /api/projects/:id/with-stakeholders` - Get project with stakeholders
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Stakeholders
- `GET /api/stakeholders/project/:projectId` - Get stakeholders for a project
- `GET /api/stakeholders/project/:projectId/high-risk` - Get high-risk stakeholders
- `GET /api/stakeholders/:id` - Get stakeholder by ID
- `GET /api/stakeholders/:id/with-interactions` - Get stakeholder with interactions
- `POST /api/stakeholders` - Create new stakeholder
- `PUT /api/stakeholders/:id` - Update stakeholder
- `DELETE /api/stakeholders/:id` - Delete stakeholder
- `POST /api/stakeholders/calculate-risk` - Calculate risk score

### Interactions
- `GET /api/interactions/stakeholder/:stakeholderId` - Get all interactions
- `GET /api/interactions/stakeholder/:stakeholderId/recent` - Get recent interactions
- `GET /api/interactions/follow-up` - Get all interactions requiring follow-up
- `GET /api/interactions/:id` - Get interaction by ID
- `POST /api/interactions` - Log new interaction
- `PUT /api/interactions/:id` - Update interaction
- `DELETE /api/interactions/:id` - Delete interaction

## Risk Calculation

Risk score is calculated as:
```
base_score = (power + influence) / 2
risk_score = base_score * engagement_factor

engagement_factors:
- resistant: 2.0 (doubles the risk)
- neutral: 1.5 (increases by 50%)
- supportive: 0.5 (halves the risk)
```

## Database

Uses SQLite for data storage. Database file is created automatically on first run at `database/stakeholder_radar.db`.
