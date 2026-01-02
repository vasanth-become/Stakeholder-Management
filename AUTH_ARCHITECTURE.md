# Authentication System Architecture

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Login Form   │  │ Auth Context │  │ Protected Routes │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                  │                    │            │
│         └──────────────────┴────────────────────┘            │
│                            │                                 │
│                    httpOnly Cookies                          │
│                    (accessToken, refreshToken)               │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────▼──────────┐
                    │   HTTPS/TLS       │
                    └────────┬──────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    BACKEND (Express)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Auth Routes  │  │  Middleware  │  │ Rate Limiting    │  │
│  │ /auth/*      │  │  verifyAuth  │  │ Brute Force Prot │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                  │                    │            │
│         └──────────────────┴────────────────────┘            │
│                            │                                 │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────▼──────────┐
                    │   POSTGRES DB     │
                    │                   │
                    │ • users           │
                    │ • refresh_tokens  │
                    │ • login_attempts  │
                    │ • audit_logs      │
                    └───────────────────┘
```

## 🔐 Security Model

### Token Strategy: Dual Token (JWT)

**Access Token** (Short-lived: 15 minutes)
- Stored in httpOnly cookie
- Used for API authentication
- Contains: userId, email, role
- Automatically sent with requests

**Refresh Token** (Long-lived: 7 days)
- Stored in httpOnly cookie
- Used to get new access tokens
- Stored in database (allows revocation)
- Rotated on each use

### Why This Approach?

✅ **httpOnly cookies** → XSS protection (JavaScript can't access)
✅ **SameSite=Strict** → CSRF protection
✅ **Secure flag** → HTTPS only
✅ **Token rotation** → Stolen tokens expire quickly
✅ **DB storage** → Can revoke tokens server-side
✅ **Short access tokens** → Minimize damage if compromised

## 📋 Database Schema

### users
```sql
- id (UUID, PK)
- email (UNIQUE, NOT NULL)
- password_hash (NOT NULL)
- first_name
- last_name
- role (admin, user, viewer)
- email_verified (BOOLEAN, default: false)
- is_active (BOOLEAN, default: true)
- last_login_at (TIMESTAMP)
- password_changed_at (TIMESTAMP)
- failed_login_attempts (INTEGER, default: 0)
- locked_until (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### refresh_tokens
```sql
- id (UUID, PK)
- user_id (FK → users.id)
- token_hash (UNIQUE, NOT NULL)
- device_info (TEXT) -- User agent
- ip_address (VARCHAR)
- expires_at (TIMESTAMP)
- revoked (BOOLEAN, default: false)
- created_at (TIMESTAMP)
```

### login_attempts
```sql
- id (SERIAL, PK)
- email (VARCHAR)
- ip_address (VARCHAR)
- user_agent (TEXT)
- success (BOOLEAN)
- failure_reason (VARCHAR)
- attempted_at (TIMESTAMP)
```

### audit_logs
```sql
- id (SERIAL, PK)
- user_id (FK → users.id)
- action (VARCHAR) -- login, logout, password_change, etc.
- ip_address (VARCHAR)
- user_agent (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

## 🔄 Authentication Flow

### 1. Signup
```
User submits email + password
    ↓
Validate email format & password strength
    ↓
Hash password with bcrypt (12 rounds)
    ↓
Create user in DB
    ↓
Send verification email
    ↓
Return success (don't auto-login)
```

### 2. Login
```
User submits email + password
    ↓
Check brute force protection (5 attempts per IP/15 min)
    ↓
Find user by email
    ↓
Verify password with bcrypt.compare()
    ↓
Generate access token (15 min expiry)
    ↓
Generate refresh token (7 day expiry)
    ↓
Store refresh token in DB
    ↓
Set httpOnly cookies
    ↓
Log successful login
    ↓
Return user data
```

### 3. Token Refresh
```
Request with expired access token
    ↓
Extract refresh token from cookie
    ↓
Verify refresh token signature
    ↓
Check if token exists in DB & not revoked
    ↓
Generate NEW access token
    ↓
Generate NEW refresh token (rotation)
    ↓
Revoke old refresh token
    ↓
Store new refresh token
    ↓
Set new cookies
    ↓
Return success
```

### 4. Logout
```
User clicks logout
    ↓
Extract refresh token from cookie
    ↓
Mark token as revoked in DB
    ↓
Clear cookies
    ↓
Log logout event
    ↓
Redirect to login
```

### 5. Logout Everywhere
```
User requests logout all devices
    ↓
Revoke ALL refresh tokens for user
    ↓
Clear current cookies
    ↓
Log security event
    ↓
Force re-login
```

## 🛡️ Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not in common password list

### Brute Force Protection
- Max 5 failed attempts per IP in 15 minutes
- Max 10 failed attempts per email in 1 hour
- Account lockout after 10 failed attempts (30 min)
- Exponential backoff
- CAPTCHA after 3 failures (optional)

### Rate Limiting
- Auth endpoints: 5 req/min per IP
- Password reset: 3 req/hour per IP
- Token refresh: 10 req/min per IP
- All other APIs: 100 req/min per IP

### Session Management
- Access tokens: 15 minutes
- Refresh tokens: 7 days
- Remember me: 30 days
- Automatic rotation
- Concurrent session limit: 5 devices

### Audit Logging
- All login attempts (success/failure)
- Password changes
- Email changes
- Role changes
- Sensitive data access
- Token refreshes
- Logout events

## 🔑 Password Reset Flow

```
1. User requests reset
   ↓ Generate secure random token (32 bytes)
   ↓ Hash token and store in DB with 1-hour expiry
   ↓ Send email with reset link containing token

2. User clicks link
   ↓ Verify token exists and not expired
   ↓ Show password reset form

3. User submits new password
   ↓ Verify token again
   ↓ Hash new password
   ↓ Update user password
   ↓ Invalidate token
   ↓ Revoke all refresh tokens (logout everywhere)
   ↓ Send confirmation email
   ↓ Log password change
```

## 🌐 Google OAuth Flow (Optional)

```
1. User clicks "Sign in with Google"
   ↓ Redirect to Google OAuth consent screen

2. User authorizes
   ↓ Google redirects back with auth code
   ↓ Exchange code for access token
   ↓ Get user profile from Google

3. Find or create user
   ↓ If new: Create user (no password needed)
   ↓ If existing: Link Google account
   ↓ Generate our access + refresh tokens
   ↓ Set httpOnly cookies
   ↓ Log OAuth login
```

## 📁 File Structure

```
backend/
├── config/
│   ├── auth.js              # Auth config (JWT secret, expiry, etc.)
│   └── database.js          # DB connection
├── controllers/
│   └── authController.js    # Auth logic (signup, login, etc.)
├── middleware/
│   ├── auth.js              # JWT verification middleware
│   ├── rateLimiter.js       # Rate limiting
│   └── bruteForce.js        # Brute force protection
├── models/
│   ├── User.js              # User model
│   ├── RefreshToken.js      # Refresh token model
│   └── AuditLog.js          # Audit log model
├── routes/
│   └── auth.js              # Auth routes
├── services/
│   ├── authService.js       # Auth business logic
│   ├── tokenService.js      # Token generation/verification
│   ├── emailService.js      # Email sending
│   └── auditService.js      # Audit logging
└── utils/
    ├── passwordValidator.js # Password strength validation
    └── crypto.js            # Crypto utilities

frontend/
├── src/
│   ├── contexts/
│   │   └── AuthContext.js   # Auth state management
│   ├── components/
│   │   ├── LoginForm.js     # Login UI
│   │   ├── SignupForm.js    # Signup UI
│   │   └── ProtectedRoute.js# Route protection
│   ├── services/
│   │   └── authService.js   # API calls
│   └── hooks/
│       └── useAuth.js       # Auth hook
```

## 🚀 Environment Variables

```bash
# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cookies
COOKIE_DOMAIN=localhost
COOKIE_SECURE=true  # HTTPS only in production
COOKIE_SAMESITE=strict

# Password
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Rate Limiting
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX_REQUESTS=5

# Brute Force
MAX_LOGIN_ATTEMPTS=10
LOCKOUT_DURATION=30  # minutes

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@stakeholderradar.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Security
CORS_ORIGIN=http://localhost:3000
SESSION_SECRET=your-session-secret-min-32-chars
```

## ✅ Security Checklist

- [x] Passwords hashed with bcrypt (12+ rounds)
- [x] httpOnly cookies for tokens
- [x] Secure flag on cookies (HTTPS)
- [x] SameSite=Strict to prevent CSRF
- [x] Rate limiting on auth endpoints
- [x] Brute force protection
- [x] Account lockout after failed attempts
- [x] Password strength validation
- [x] Token rotation on refresh
- [x] Refresh tokens stored in DB
- [x] Audit logging for security events
- [x] Password reset with secure tokens
- [x] Email verification (optional)
- [x] Logout everywhere functionality
- [x] Input validation & sanitization
- [x] SQL injection protection (parameterized queries)
- [x] XSS protection (httpOnly cookies)
- [x] CSRF protection (SameSite cookies)

## 📊 Monitoring & Alerts

### Metrics to Track
- Failed login attempts (spike = potential attack)
- Account lockouts
- Password reset requests
- Token refresh rate
- Session duration
- Concurrent sessions per user

### Alerts to Set Up
- 🚨 High failed login rate (>100/min)
- 🚨 Multiple lockouts from same IP
- 🚨 Mass password reset requests
- 🚨 Unusual token refresh patterns
- 🚨 Database connection failures

## 🧪 Testing Checklist

### Unit Tests
- [ ] Password hashing/verification
- [ ] Token generation/verification
- [ ] Password strength validation
- [ ] Rate limiter logic
- [ ] Brute force detection

### Integration Tests
- [ ] Signup flow
- [ ] Login flow
- [ ] Token refresh flow
- [ ] Logout flow
- [ ] Password reset flow
- [ ] OAuth flow

### Security Tests
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] CSRF attacks
- [ ] Brute force attacks
- [ ] Token theft scenarios
- [ ] Session fixation

## 🐛 Common Issues & Solutions

**Issue**: "Token expired" on every request
**Solution**: Check server/client time sync. Access token might be too short.

**Issue**: CORS errors on auth endpoints
**Solution**: Ensure `credentials: 'include'` in fetch and `cors({ credentials: true })` on backend.

**Issue**: Cookies not being set
**Solution**: Check COOKIE_SECURE=false in dev (unless using https://localhost)

**Issue**: Brute force protection too aggressive
**Solution**: Whitelist trusted IPs or increase thresholds for dev.

**Issue**: Password reset emails not sending
**Solution**: Check SMTP credentials and enable "less secure apps" for Gmail.

## 📚 Next Steps

1. **Week 1**: Implement core auth (signup, login, logout)
2. **Week 2**: Add token refresh and session management
3. **Week 3**: Implement password reset flow
4. **Week 4**: Add brute force protection and rate limiting
5. **Month 2**: Add Google OAuth
6. **Month 3**: Add 2FA (TOTP)
7. **Month 4**: Add magic link login

## 🔗 Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [bcrypt NPM](https://www.npmjs.com/package/bcrypt)
- [Passport.js](http://www.passportjs.org/)
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
