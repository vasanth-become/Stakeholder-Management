const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const projectRoutes = require('./routes/projects');
const stakeholderRoutes = require('./routes/stakeholders');
const interactionRoutes = require('./routes/interactions');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/stakeholders', stakeholderRoutes);
app.use('/api/interactions', interactionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Stakeholder Radar API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Stakeholder Radar API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
