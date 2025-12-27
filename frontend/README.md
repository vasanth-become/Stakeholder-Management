# Stakeholder Radar - Frontend

A React-based web application for managing stakeholder relationships and tracking engagement risk.

## Features

### Dashboard
- View all projects
- See top 5 high-risk stakeholders across all projects
- Create new projects

### Project Page
- List all stakeholders in a project
- View stakeholder metrics (power, influence, engagement, risk score)
- Add new stakeholders with detailed information

### Stakeholder Page
- View complete stakeholder details
- Visual risk score indicator
- Full interaction history timeline
- Log new interactions/meetings
- Track follow-up items

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure the backend is running on http://localhost:3001

3. Start the development server:
```bash
npm start
```

The app will open at http://localhost:3000

## Project Structure

```
src/
├── components/      # Reusable components
│   └── Navigation.js
├── pages/          # Page components
│   ├── Dashboard.js
│   ├── ProjectPage.js
│   └── StakeholderPage.js
├── services/       # API service layer
│   └── api.js
├── App.js          # Main app with routing
├── App.css         # Global styles
└── index.js        # React entry point
```

## Risk Score Visualization

The app uses color-coded risk indicators:
- **High Risk (≥7)**: Red - Requires immediate attention
- **Medium Risk (4-6.9)**: Orange - Monitor closely
- **Low Risk (<4)**: Green - Stable relationship

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
