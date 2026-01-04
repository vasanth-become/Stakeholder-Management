const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import routes
const projectRoutes = require('./routes/projects');
const stakeholderRoutes = require('./routes/stakeholders');
const interactionRoutes = require('./routes/interactions');
const authRoutes = require('./routes/auth');
const securityRoutes = require('./routes/security');
const oauthRoutes = require('./routes/oauth');
const insightsRoutes = require('./routes/insights');
const aiRoutes = require('./routes/ai');
const visualInsightsRoutes = require('./routes/visualInsights');
const commentsRoutes = require('./routes/comments');
const notificationsRoutes = require('./routes/notifications');

// Import middleware
const { oauthErrorHandler } = require('./middleware/oauth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Middleware
// In development, allow all origins for cloud IDE compatibility
// In production, set FRONTEND_URL environment variable
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || 'http://localhost:3000')
    : true, // Allow all origins in development
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/stakeholders', stakeholderRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/auth', authRoutes);
app.use('/api/security', securityRoutes);
app.use('/oauth', oauthRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/visual-insights', visualInsightsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Stakeholder Radar API is running' });
});

// OAuth error handling middleware
app.use(oauthErrorHandler());

// Multer error handling middleware
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    console.error('[Multer Error]:', err.message);
    return res.status(400).json({
      error: `File upload error: ${err.message}`
    });
  }
  next(err);
});

// General error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR:`, err.stack);

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Stakeholder Radar API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
