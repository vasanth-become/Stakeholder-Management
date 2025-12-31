# OAuth Integration Layer - Implementation Guide

## 📚 Overview

This document explains the secure OAuth 2.0 integration layer implemented for Stakeholder Radar. The system supports **Slack**, **Google** (Gmail & Sheets), and **Jira** integrations with enterprise-grade security.

## 🔐 Security Features

✅ **Encrypted Token Storage** - AES-256-CBC encryption for all tokens
✅ **CSRF Protection** - State parameter validation
✅ **Automatic Token Refresh** - Seamless token renewal
✅ **Environment Variables** - No hardcoded secrets
✅ **Request Logging** - Full audit trail
✅ **Error Handling** - Graceful failure handling

---

## 📁 Project Structure

```
backend/
├── config/
│   └── oauth.js              # OAuth provider configurations
├── database/
│   └── db.js                 # Database schema (includes oauth_tokens table)
├── models/
│   └── OAuthToken.js         # Token storage with encryption
├── routes/
│   └── auth.js               # OAuth routes (/auth/*)
├── middleware/
│   └── oauth.js              # OAuth middleware functions
├── utils/
│   └── oauth.js              # Token refresh & utilities
├── .env.example              # Environment variables template
└── server.js                 # Updated with OAuth routes

frontend/
├── components/
│   └── OAuthButton.js        # Reusable OAuth button component
├── pages/
│   ├── IntegrationsPage.js   # Updated with real OAuth
│   └── OAuthCallback.js      # OAuth callback handler
└── App.js                    # Updated with callback route
```

---

## 🚀 Setup Instructions

### 1. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install dotenv
```

#### Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

#### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it to `.env` as `ENCRYPTION_KEY`.

#### Update `.env` File

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Session Secret
SESSION_SECRET=your-super-secret-session-key-change-this

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/auth/callback/slack

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback/google

# Jira OAuth
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_REDIRECT_URI=http://localhost:3001/auth/callback/jira

# Encryption Key (generated above)
ENCRYPTION_KEY=your-256-bit-key-in-hex

# OAuth State Secret
OAUTH_STATE_SECRET=your-oauth-state-secret
```

### 2. Frontend Setup

#### Create `.env` file in frontend/

```env
REACT_APP_API_URL=http://localhost:3001
```

### 3. Get OAuth Credentials

#### Slack

1. Go to https://api.slack.com/apps
2. Create a new app
3. Add OAuth scopes: `channels:read`, `channels:write`, `chat:write`, `users:read`, `team:read`
4. Copy **Client ID** and **Client Secret**
5. Add redirect URL: `http://localhost:3001/auth/callback/slack`

#### Google

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Gmail API and Google Sheets API
4. Create OAuth 2.0 credentials
5. Add redirect URL: `http://localhost:3001/auth/callback/google`
6. Copy **Client ID** and **Client Secret**

#### Jira

1. Go to https://developer.atlassian.com/console/myapps/
2. Create a new OAuth 2.0 app
3. Add scopes: `read:jira-user`, `read:jira-work`, `write:jira-work`, `offline_access`
4. Add redirect URL: `http://localhost:3001/auth/callback/jira`
5. Copy **Client ID** and **Client Secret**

### 4. Start the Application

```bash
# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start
```

---

## 🔄 OAuth Flow Explained

### Authorization Flow

```
┌─────────┐              ┌──────────┐              ┌─────────────┐
│ User    │              │ Backend  │              │ OAuth       │
│ Browser │              │ Server   │              │ Provider    │
└────┬────┘              └────┬─────┘              └──────┬──────┘
     │                        │                           │
     │  1. Click "Connect"    │                           │
     │────────────────────────>                           │
     │                        │                           │
     │  2. Generate state &   │                           │
     │     redirect to provider                           │
     │<───────────────────────│                           │
     │                        │                           │
     │  3. Authorize app                                  │
     │───────────────────────────────────────────────────>│
     │                                                     │
     │  4. Redirect with code & state                     │
     │<────────────────────────────────────────────────────│
     │                        │                           │
     │  5. Callback with code │                           │
     │────────────────────────>                           │
     │                        │  6. Exchange code         │
     │                        │    for tokens             │
     │                        │──────────────────────────>│
     │                        │                           │
     │                        │  7. Return access token   │
     │                        │<───────────────────────────│
     │                        │                           │
     │                        │  8. Encrypt & save token  │
     │                        │                           │
     │  9. Redirect to        │                           │
     │     integrations page  │                           │
     │<───────────────────────│                           │
     │                        │                           │
```

### Token Refresh Flow

```
┌─────────┐              ┌──────────┐              ┌─────────────┐
│ API     │              │ OAuth    │              │ OAuth       │
│ Request │              │ Middleware│              │ Provider    │
└────┬────┘              └────┬─────┘              └──────┬──────┘
     │                        │                           │
     │  1. Make API request   │                           │
     │────────────────────────>                           │
     │                        │                           │
     │                        │  2. Check token expiry    │
     │                        │                           │
     │                        │  3. Token expired?        │
     │                        │    Use refresh token      │
     │                        │──────────────────────────>│
     │                        │                           │
     │                        │  4. New access token      │
     │                        │<───────────────────────────│
     │                        │                           │
     │                        │  5. Update stored token   │
     │                        │                           │
     │  6. Proceed with       │                           │
     │     valid token        │                           │
     │<───────────────────────│                           │
     │                        │                           │
```

---

## 📋 API Reference

### OAuth Routes

#### **GET /auth/:provider**
Initiate OAuth flow for a provider.

**Parameters:**
- `provider` (path): `slack`, `google`, or `jira`
- `userId` (query): User identifier

**Response:** Redirects to OAuth provider authorization page

---

#### **GET /auth/callback/:provider**
Handle OAuth callback from provider.

**Parameters:**
- `provider` (path): Provider name
- `code` (query): Authorization code
- `state` (query): CSRF state token

**Response:** Redirects to frontend with success/error

---

#### **GET /auth/status**
Get OAuth connection status for all providers.

**Response:**
```json
{
  "connections": {
    "slack": {
      "connected": true,
      "expired": false,
      "scopes": ["channels:read", "chat:write"],
      "connectedAt": "2024-01-15T10:30:00Z"
    },
    "google": {
      "connected": false,
      "expired": false,
      "scopes": null,
      "connectedAt": null
    }
  }
}
```

---

#### **POST /auth/disconnect/:provider**
Disconnect OAuth provider.

**Parameters:**
- `provider` (path): Provider name
- `userId` (query): User identifier

**Response:**
```json
{
  "success": true,
  "message": "Successfully disconnected from slack",
  "provider": "slack"
}
```

---

#### **GET /auth/connections**
Get all active OAuth connections for user.

**Parameters:**
- `userId` (query): User identifier

**Response:**
```json
{
  "userId": "default-user",
  "connections": [
    {
      "provider": "slack",
      "tokenType": "Bearer",
      "expiresAt": "2024-01-16T10:30:00Z",
      "scopes": ["channels:read", "chat:write"],
      "createdAt": "2024-01-15T10:30:00Z",
      "isExpired": false
    }
  ],
  "count": 1
}
```

---

## 🛠️ Usage Examples

### Using OAuth Middleware

Protect routes that require OAuth credentials:

```javascript
const { injectOAuthCredentials } = require('./middleware/oauth');

// Require Slack connection
router.get('/slack/channels',
  injectOAuthCredentials('slack'),
  async (req, res) => {
    const { accessToken } = req.oauth;

    // Use accessToken to call Slack API
    const response = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    res.json(data);
  }
);
```

### Optional OAuth Connection

```javascript
// OAuth is optional
router.get('/dashboard',
  injectOAuthCredentials('slack', { required: false }),
  (req, res) => {
    if (req.oauth) {
      // User has Slack connected
      console.log('Slack connected:', req.oauth.userId);
    } else {
      // No Slack connection
      console.log('Slack not connected');
    }

    res.json({ status: 'ok' });
  }
);
```

### Manually Refresh Token

```javascript
const { refreshAccessToken } = require('./utils/oauth');

// Refresh token manually
const newToken = await refreshAccessToken('user-123', 'google');
console.log('New access token:', newToken.accessToken);
```

---

## 🔒 Security Best Practices

### ✅ What We Did Right

1. **Encrypted Storage**: All tokens encrypted with AES-256-CBC
2. **Environment Variables**: No secrets in code
3. **State Validation**: CSRF protection via state parameter
4. **Token Expiry**: Automatic refresh before expiration
5. **HTTPS Ready**: Configured for production HTTPS
6. **Logging**: Comprehensive request and error logging
7. **Error Handling**: Graceful degradation

### ⚠️ Production Checklist

Before deploying to production:

- [ ] Generate strong encryption keys
- [ ] Use HTTPS for all endpoints
- [ ] Update redirect URIs to production URLs
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Review OAuth scopes (request minimum needed)
- [ ] Implement proper session management
- [ ] Add database backups
- [ ] Set NODE_ENV=production
- [ ] Review CORS settings

---

## 🐛 Troubleshooting

### OAuth Flow Fails

**Issue**: "Invalid state parameter"
**Solution**: Clear browser cache and try again. Check that `OAUTH_STATE_SECRET` is set.

**Issue**: "Missing OAuth credentials"
**Solution**: Verify `.env` file has correct CLIENT_ID and CLIENT_SECRET for the provider.

### Token Refresh Fails

**Issue**: "No refresh token available"
**Solution**: Some providers require `access_type=offline` (Google) or `offline_access` scope (Jira). Re-connect to get refresh token.

### Database Errors

**Issue**: "oauth_tokens table not found"
**Solution**: Restart backend server to run database migrations.

---

## 📊 Database Schema

### `oauth_tokens` Table

```sql
CREATE TABLE oauth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('slack', 'google', 'jira')),
  access_token TEXT NOT NULL,        -- Encrypted
  refresh_token TEXT,                -- Encrypted
  token_type TEXT DEFAULT 'Bearer',
  expires_at DATETIME,
  scopes TEXT,                       -- JSON string
  metadata TEXT,                     -- JSON string
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);
```

---

## 🎯 Next Steps

### Recommended Enhancements

1. **User Authentication**: Implement real user sessions (currently using `default-user`)
2. **Token Revocation**: Call provider revocation endpoints when disconnecting
3. **Scope Management**: Allow users to update scopes without full re-auth
4. **Activity Logging**: Log all OAuth-related actions for audit
5. **Redis Cache**: Use Redis for OAuth state storage instead of in-memory Map
6. **Webhook Support**: Listen for token revocation webhooks from providers
7. **Multi-tenancy**: Support multiple workspaces/teams per user

---

## 📝 License

This OAuth implementation follows industry best practices and complies with OAuth 2.0 RFC 6749.

---

## 🙏 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review provider-specific OAuth documentation
3. Check application logs for detailed error messages

---

**Built with security and simplicity in mind** 🔐
