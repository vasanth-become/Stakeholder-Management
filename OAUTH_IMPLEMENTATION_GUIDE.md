# OAuth Token Storage - Implementation Guide

Complete guide for securely storing and managing OAuth tokens for Slack, Google, and Jira integrations.

## 🔒 Security Features

✅ **Encrypted at Rest** - AES-256-GCM encryption for all tokens
✅ **Secure Rotation** - Automatic token refresh with retry logic
✅ **Never Exposed to Frontend** - Tokens stay on backend only
✅ **Revocation Support** - Revoke access at provider and locally
✅ **Audit Logging** - Track all token operations
✅ **Retry Logic** - Exponential backoff for failed operations

---

## 📦 What's Included

### Database (1 file)
- `backend/migrations/003_create_oauth_tables.sql` - Complete schema with encryption

### Services (5 files)
- `backend/services/encryptionService.js` - AES-256-GCM encryption
- `backend/services/oauthTokenService.js` - Token storage and rotation
- `backend/services/integrations/slackService.js` - Slack OAuth & API
- `backend/services/integrations/googleService.js` - Google OAuth & API
- `backend/services/integrations/jiraService.js` - Jira OAuth & API

### Routes (1 file)
- `backend/routes/oauth.js` - OAuth flow handlers

---

## 🚀 Quick Start

### 1. Set Environment Variables

```bash
# Encryption (REQUIRED - Generate secure random keys)
OAUTH_ENCRYPTION_KEY=your-32-character-encryption-key-here-make-it-secure
OAUTH_KEY_SALT=your-salt-value-change-this-in-production

# Slack
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/oauth/slack/callback

# Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/oauth/google/callback

# Jira
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_REDIRECT_URI=http://localhost:3001/oauth/jira/callback
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Run Database Migration

```bash
psql -U your_user -d stakeholder_radar -f backend/migrations/003_create_oauth_tables.sql
```

### 3. Add Routes to Server

```javascript
// server.js or app.js
const oauthRoutes = require('./routes/oauth');

app.use('/oauth', oauthRoutes);
```

### 4. Test the Setup

```bash
# Start your server
npm start

# Test encryption
curl http://localhost:3001/oauth/test-encryption
```

---

## 🔐 Encryption Architecture

### How Tokens are Encrypted

```
Plaintext Token → AES-256-GCM → IV + Encrypted Data + Auth Tag → Database
```

**Security Features:**
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Random IV**: New IV for every encryption
- **Authentication Tag**: Prevents tampering
- **No PII Logging**: Tokens are masked in logs

### Encryption Service API

```javascript
const encryptionService = require('./services/encryptionService');

// Encrypt data
const encrypted = encryptionService.encrypt('sensitive-token');

// Decrypt data
const decrypted = encryptionService.decrypt(encrypted);

// Hash for comparison
const hash = encryptionService.hash('data');

// Mask for logging
const masked = encryptionService.maskSensitive('secret-token-123'); // → "secr***"
```

---

## 🔄 OAuth Flow

### Slack OAuth Flow

```
1. User clicks "Connect Slack"
   GET /oauth/slack/authorize
   ↓
2. Backend generates state and returns authUrl
   { authUrl: "https://slack.com/oauth/..." }
   ↓
3. Frontend redirects user to authUrl
   User authorizes on Slack
   ↓
4. Slack redirects to callback
   GET /oauth/slack/callback?code=xxx&state=xxx
   ↓
5. Backend exchanges code for tokens
   POST https://slack.com/api/oauth.v2.access
   ↓
6. Backend encrypts and stores tokens
   INSERT INTO oauth_connections (access_token_encrypted, ...)
   ↓
7. Backend redirects to success page
   Redirect /integrations?success=slack
```

### Google OAuth Flow

```
1. User clicks "Connect Google"
   GET /oauth/google/authorize
   ↓
2. Backend returns authUrl with offline_access
   { authUrl: "https://accounts.google.com/o/oauth2/..." }
   ↓
3. User authorizes on Google
   ↓
4. Google redirects to callback
   GET /oauth/google/callback?code=xxx&state=xxx
   ↓
5. Backend exchanges code for tokens
   POST https://oauth2.googleapis.com/token
   Response: { access_token, refresh_token, expires_in }
   ↓
6. Backend stores encrypted tokens
   ↓
7. Success redirect
```

### Jira OAuth Flow

```
1. User clicks "Connect Jira"
   GET /oauth/jira/authorize
   ↓
2. Backend returns authUrl with offline_access scope
   ↓
3. User authorizes on Atlassian
   ↓
4. Callback with code
   GET /oauth/jira/callback?code=xxx
   ↓
5. Exchange code for tokens
   POST https://auth.atlassian.com/oauth/token
   ↓
6. Get accessible resources (Jira sites)
   GET https://api.atlassian.com/oauth/token/accessible-resources
   ↓
7. Store tokens with cloud_id
```

---

## 💻 Usage Examples

### Backend: Initiate OAuth

```javascript
// User clicks "Connect Slack"
router.get('/connect/slack', verifyAuth, (req, res) => {
  const state = generateState(req.user.userId, 'slack');
  const authUrl = slackService.getAuthorizationUrl(state);

  res.json({ authUrl });
});
```

### Backend: Use Stored Token

```javascript
// Send Slack message using stored token
router.post('/slack/message', verifyAuth, async (req, res) => {
  const { channel, text } = req.body;

  try {
    const result = await slackService.sendMessage(
      req.user.userId,
      channel,
      text
    );

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Backend: Refresh Token Automatically

```javascript
// Token service automatically refreshes when needed
const tokenData = await oauthTokenService.getAccessToken(userId, 'google');

if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
  await oauthTokenService.refreshAccessToken(
    tokenData.connection.id,
    googleService.refreshAccessToken.bind(googleService)
  );
}
```

### Backend: Revoke Connection

```javascript
router.delete('/integrations/:connectionId', verifyAuth, async (req, res) => {
  await oauthTokenService.revokeConnection(
    req.params.connectionId,
    req.user.userId,
    'User requested disconnect',
    slackService.revokeAccessToken.bind(slackService)
  );

  res.json({ message: 'Disconnected successfully' });
});
```

---

## 🔄 Token Rotation

### Automatic Refresh

Tokens are automatically refreshed when:
1. Token expires within 5 minutes (configurable)
2. API call fails with 401 Unauthorized
3. Manual refresh requested

**Refresh Logic:**
```javascript
async refreshAccessToken(connectionId, refreshFunction) {
  const MAX_RETRY_ATTEMPTS = 3;
  let attempt = 0;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    try {
      // Get refresh token (encrypted)
      const refreshToken = await getRefreshToken(connectionId);

      // Call provider refresh endpoint
      const newTokens = await refreshFunction(refreshToken);

      // Store new tokens (encrypted)
      await storeTokens(newTokens);

      // Log success
      await logTokenRotation(connectionId, 'refresh', true);

      return newTokens;
    } catch (error) {
      attempt++;

      // Exponential backoff: 2s, 4s, 8s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  // Mark as error after all retries fail
  await markConnectionAsError(connectionId);
}
```

### Manual Refresh

```javascript
// Force refresh a token
await oauthTokenService.refreshAccessToken(
  connectionId,
  googleService.refreshAccessToken.bind(googleService)
);
```

---

## 📊 Database Schema

### Tables

**oauth_providers** - Provider configurations
```sql
id, name, display_name, auth_url, token_url, revoke_url, scopes, enabled
```

**oauth_connections** - Encrypted token storage
```sql
id, user_id, provider_id,
access_token_encrypted, refresh_token_encrypted,
expires_at, scopes, status,
provider_user_id, provider_user_email, provider_workspace_id,
last_used_at, last_refresh_at, created_at
```

**oauth_token_rotations** - Audit log
```sql
id, connection_id, action, success, error_message, triggered_by, created_at
```

### Indexes

```sql
idx_oauth_connections_user       -- Fast user lookups
idx_oauth_connections_provider   -- Fast provider lookups
idx_oauth_connections_status     -- Filter by status
idx_oauth_connections_expires    -- Find expiring tokens
```

---

## 🎯 API Reference

### OAuth Routes

#### GET `/oauth/{provider}/authorize`
Initiate OAuth flow

**Protected**: Yes (requires auth)

**Response:**
```json
{
  "authUrl": "https://provider.com/oauth/authorize?..."
}
```

#### GET `/oauth/{provider}/callback`
OAuth callback handler

**Protected**: No (public callback)

**Query Params:**
- `code` - Authorization code
- `state` - CSRF protection token
- `error` - Error message (if authorization failed)

**Response:** Redirects to `/integrations?success={provider}` or `?error={reason}`

#### GET `/oauth/connections`
Get all OAuth connections for current user

**Protected**: Yes

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "provider": "slack",
      "providerDisplayName": "Slack",
      "status": "active",
      "scopes": ["channels:read", "chat:write"],
      "expiresAt": "2024-12-31T23:59:59Z",
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "providerEmail": "user@slack.com",
      "providerWorkspace": "T12345"
    }
  ]
}
```

#### DELETE `/oauth/connections/:connectionId`
Revoke OAuth connection

**Protected**: Yes

**Body:**
```json
{
  "reason": "No longer needed"
}
```

**Response:**
```json
{
  "message": "Connection revoked successfully",
  "connectionId": "uuid"
}
```

#### POST `/oauth/connections/:connectionId/test`
Test OAuth connection

**Protected**: Yes

**Response:**
```json
{
  "connectionId": "uuid",
  "provider": "google",
  "isValid": true,
  "testedAt": "2024-01-15T12:00:00Z"
}
```

---

## 🛠️ Provider-Specific APIs

### Slack Service

```javascript
const slackService = require('./services/integrations/slackService');

// Get user info
const user = await slackService.getUserInfo(userId);

// Send message
await slackService.sendMessage(userId, '#general', 'Hello!');

// List channels
const channels = await slackService.listChannels(userId);

// Test connection
const isValid = await slackService.testConnection(userId);
```

### Google Service

```javascript
const googleService = require('./services/integrations/googleService');

// Get user info
const user = await googleService.getUserInfo(userId);

// List calendar events
const events = await googleService.listCalendarEvents(userId, {
  maxResults: 10,
  timeMin: new Date().toISOString()
});

// Send email
await googleService.sendEmail(userId, {
  to: 'recipient@example.com',
  subject: 'Hello',
  body: 'Email body'
});
```

### Jira Service

```javascript
const jiraService = require('./services/integrations/jiraService');

// Get accessible resources (Jira sites)
const resources = await jiraService.getAccessibleResources(userId);
const cloudId = resources[0].id;

// List projects
const projects = await jiraService.listProjects(userId, cloudId);

// Create issue
await jiraService.createIssue(userId, cloudId, {
  projectKey: 'PROJ',
  summary: 'Bug report',
  description: 'Description here',
  issueType: 'Bug'
});

// Search issues
const results = await jiraService.searchIssues(
  userId,
  cloudId,
  'project = PROJ AND status = "In Progress"'
);
```

---

## 🔒 Security Best Practices

### ✅ DO

- Store `OAUTH_ENCRYPTION_KEY` in environment variables
- Use different encryption keys for dev/staging/production
- Rotate encryption keys periodically (use key rotation function)
- Log all OAuth operations (connections, revocations, failures)
- Validate state tokens to prevent CSRF
- Use HTTPS in production
- Set secure cookies for OAuth state
- Implement rate limiting on OAuth endpoints
- Monitor failed refresh attempts
- Clean up old revoked connections periodically

### ❌ DON'T

- Never log decrypted tokens
- Never send tokens to frontend
- Never reuse encryption keys across environments
- Never commit credentials to git
- Never skip state validation
- Don't store tokens in localStorage
- Don't expose OAuth secrets in client-side code
- Don't trust client-side token validation

---

## 📝 Configuration

### OAuth Provider Setup

#### Slack

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Create new app → "From scratch"
3. Enable OAuth & Permissions
4. Add Redirect URL: `http://localhost:3001/oauth/slack/callback`
5. Add OAuth Scopes:
   - `channels:read`
   - `channels:write`
   - `chat:write`
   - `users:read`
   - `users:read.email`
6. Install to workspace
7. Copy Client ID and Client Secret

#### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Add Authorized redirect URI: `http://localhost:3001/oauth/google/callback`
6. Copy Client ID and Client Secret

#### Jira

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create OAuth 2.0 integration
3. Add Callback URL: `http://localhost:3001/oauth/jira/callback`
4. Add Scopes:
   - `read:jira-user`
   - `read:jira-work`
   - `write:jira-work`
   - `offline_access`
5. Copy Client ID and Client Secret

---

## 🧪 Testing

### Test Encryption

```javascript
const encryptionService = require('./services/encryptionService');

// Test encryption/decryption
const plaintext = 'test-token-12345';
const encrypted = encryptionService.encrypt(plaintext);
const decrypted = encryptionService.decrypt(encrypted);

console.assert(plaintext === decrypted, 'Encryption test failed');
```

### Test OAuth Flow (Manual)

```bash
# 1. Get authorization URL
curl http://localhost:3001/oauth/slack/authorize \
  -H "Cookie: accessToken=your-token"

# 2. Copy authUrl and open in browser

# 3. After authorization, you'll be redirected to callback

# 4. Check connections
curl http://localhost:3001/oauth/connections \
  -H "Cookie: accessToken=your-token"
```

### Test Token Refresh

```javascript
// Force token refresh
const connectionId = 'your-connection-id';

await oauthTokenService.refreshAccessToken(
  connectionId,
  googleService.refreshAccessToken.bind(googleService)
);
```

---

## 🚨 Troubleshooting

**Problem**: Encryption key verification failed

**Solution**: Check `OAUTH_ENCRYPTION_KEY` is set correctly and is 32+ characters

---

**Problem**: Token refresh fails with 401

**Solution**:
- Check if refresh token is valid
- Verify provider credentials are correct
- Check if user revoked access at provider

---

**Problem**: State validation fails

**Solution**:
- Ensure cookies are enabled
- Check redirect URI matches exactly
- State tokens expire after 10 minutes

---

**Problem**: Tokens not decrypting

**Solution**:
- Don't change encryption key after storing tokens
- Use key rotation function if you need to change keys
- Check database has bytea column type

---

## 🔄 Maintenance

### Cleanup Old Connections

```javascript
// Run periodically (e.g., daily cron job)
const deletedCount = await oauthTokenService.cleanup(90); // 90 days
console.log(`Cleaned up ${deletedCount} old connections`);
```

### Rotate Encryption Key

```javascript
const newKey = crypto.randomBytes(32).toString('base64');

await encryptionService.rotateEncryptionKey(newKey);

// Update environment variable
// OAUTH_ENCRYPTION_KEY=new-key
```

### Monitor Token Refresh Failures

```sql
SELECT
  oc.id,
  op.name as provider,
  oc.refresh_attempts,
  oc.last_error,
  oc.last_error_at
FROM oauth_connections oc
JOIN oauth_providers op ON oc.provider_id = op.id
WHERE oc.status = 'error'
AND oc.last_error_at > NOW() - INTERVAL '1 day'
ORDER BY oc.last_error_at DESC;
```

---

## 📚 Additional Resources

- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [Slack OAuth Guide](https://api.slack.com/authentication/oauth-v2)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [Jira OAuth Guide](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)

---

## ✅ Checklist

Before deploying:

- [ ] Set strong `OAUTH_ENCRYPTION_KEY` (32+ chars)
- [ ] Configure all provider credentials
- [ ] Run database migration
- [ ] Test OAuth flow for each provider
- [ ] Enable HTTPS in production
- [ ] Set up monitoring for failed refreshes
- [ ] Configure cleanup cron job
- [ ] Add rate limiting to OAuth endpoints
- [ ] Test token rotation
- [ ] Verify tokens never exposed to frontend
- [ ] Enable audit logging
- [ ] Document provider setup for your team
