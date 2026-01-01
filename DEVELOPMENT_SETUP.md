# Stakeholder Radar - Development Setup Guide

## Current Issue: API Connection Error

You're seeing "Unexpected token '<', "<!DOCTYPE" error because the browser cannot reach the API backend.

## How to Access the Application

### Option 1: Direct Access (Recommended for Cloud IDEs)

1. The **backend** is running on: `http://localhost:3001`
2. The **frontend** webpack dev server is running on: `http://localhost:3000`

**You MUST access the frontend at:**
```
http://localhost:3000
```

If you're accessing through a different URL (like a web preview URL), the webpack proxy won't work.

### Option 2: Port Forwarding (If Using Claude Code/Cloud IDE)

If you're in a cloud IDE:

1. Both servers are running:
   - Backend: port `3001`
   - Frontend: port `3000`

2. You need to access the frontend through port `3000` forwarding/preview
3. The frontend webpack dev server will proxy `/api` requests to the backend

### Verification Steps

1. **Check what URL you're using**:
   - ✅ Correct: `http://localhost:3000` or `[preview-url]:3000`
   - ❌ Wrong: Accessing built files directly, or different port

2. **Test the servers directly**:
   ```bash
   # Test backend (should return JSON)
   curl http://localhost:3001/api/health

   # Should return: {"status":"ok","message":"Stakeholder Radar API is running"}
   ```

3. **Test through the frontend proxy**:
   ```bash
   # This should work if proxy is configured correctly
   curl http://localhost:3000/api/health
   ```

## Current Configuration

- **Backend**: Allows all origins in development (CORS is open)
- **Frontend**: Uses webpack dev server proxy
  - Proxies `/api/*` → `http://localhost:3001/api/*`
  - Configuration in `frontend/src/setupProxy.js`

## Troubleshooting

### If you see "Unable to connect to server"
- Backend is not running
- Run: `cd backend && node server.js`

### If you see "Unexpected token '<', DOCTYPE..."
- You're not accessing through the webpack dev server (port 3000)
- OR the proxy isn't being used
- Check the URL you're using in your browser

### If nothing works
Try accessing the app directly at:
```
http://localhost:3000
```

Or if in a cloud IDE, ensure port 3000 is being forwarded/previewed correctly.

## Manual Startup Commands

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
cd frontend
npm start
```

Both should show "running" status.

## For Production Deployment

Set these environment variables:
```env
# Frontend
REACT_APP_API_URL=https://your-backend-url.com/api

# Backend
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.com
```
