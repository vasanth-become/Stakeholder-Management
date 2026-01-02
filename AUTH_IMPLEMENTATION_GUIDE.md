# Authentication Implementation Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install bcrypt jsonwebtoken express-rate-limit cookie-parser cors dotenv pg

# For production (optional)
npm install redis rate-limit-redis
```

### 2. Set Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stakeholder_radar

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cookies
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false  # Set to true in production (HTTPS)
COOKIE_SAMESITE=strict

# Password & Security
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Rate Limiting
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX_REQUESTS=5

# Brute Force
MAX_LOGIN_ATTEMPTS=10
LOCKOUT_DURATION=30  # minutes

# CORS
CORS_ORIGIN=http://localhost:3000

# Node Environment
NODE_ENV=development
```

### 3. Run Database Migration

```bash
# Connect to your Postgres database
psql -U your_user -d stakeholder_radar

# Run the migration
\i backend/migrations/001_create_auth_tables.sql
```

### 4. Add Routes to Express App

In your `server.js` or `app.js`:

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true, // Important for cookies
}));

// Auth routes
app.use('/auth', authRoutes);

// Protected routes example
const { verifyAuth } = require('./middleware/auth');

app.get('/api/protected', verifyAuth, (req, res) => {
  res.json({
    message: 'This is protected',
    user: req.user,
  });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

## 📝 API Endpoints

### Public Endpoints

#### POST `/auth/signup`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST `/auth/login`
Login and receive auth cookies.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "rememberMe": false
}
```

**Response:** `200 OK` + Sets cookies
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

**Cookies Set:**
- `accessToken` (httpOnly, 15min expiry)
- `refreshToken` (httpOnly, 7day expiry)

#### POST `/auth/logout`
Logout current session.

**Response:** `200 OK`
```json
{
  "message": "Logout successful"
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token cookie.

**Response:** `200 OK` + New cookies
```json
{
  "message": "Token refreshed successfully"
}
```

#### POST `/auth/password/forgot`
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

#### POST `/auth/password/reset`
Reset password with token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewStrongPass123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successful. Please login with your new password."
}
```

### Protected Endpoints

#### GET `/auth/me`
Get current user info.

**Headers:** Cookies with valid `accessToken`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  }
}
```

#### POST `/auth/logout-all`
Logout from all devices.

**Response:** `200 OK`
```json
{
  "message": "Logged out from all devices",
  "revokedSessions": 3
}
```

#### POST `/auth/password/change`
Change password (must be logged in).

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

#### GET `/auth/sessions`
Get all active sessions for current user.

**Response:** `200 OK`
```json
{
  "sessions": [
    {
      "id": "uuid",
      "device_info": "Desktop",
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-01T00:00:00Z",
      "last_used_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

#### DELETE `/auth/sessions/:sessionId`
Revoke a specific session.

**Response:** `200 OK`
```json
{
  "message": "Session revoked successfully"
}
```

## 🎨 Frontend Integration

### Setup Auth Context

```javascript
// frontend/src/contexts/AuthContext.js
import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('http://localhost:3001/auth/me', {
        credentials: 'include', // Important: Send cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password, rememberMe = false) {
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    setUser(data.user);
    return data;
  }

  async function logout() {
    await fetch('http://localhost:3001/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setUser(null);
  }

  async function signup(email, password, firstName, lastName) {
    const response = await fetch('http://localhost:3001/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

### Protected Route Component

```javascript
// frontend/src/components/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

### Login Form

```javascript
// frontend/src/components/LoginForm.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        Remember me
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Automatic Token Refresh

```javascript
// frontend/src/utils/api.js
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
}

export async function apiCall(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // If token expired, try to refresh
  if (response.status === 401) {
    const error = await response.json();

    if (error.code === 'TOKEN_EXPIRED' && !isRefreshing) {
      isRefreshing = true;

      try {
        await fetch('http://localhost:3001/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        isRefreshing = false;
        onRefreshed();

        // Retry original request
        response = await fetch(url, {
          ...options,
          credentials: 'include',
        });
      } catch (err) {
        isRefreshing = false;
        window.location.href = '/login';
        throw err;
      }
    } else if (isRefreshing) {
      // Wait for refresh to complete
      await new Promise(resolve => subscribeTokenRefresh(resolve));

      // Retry original request
      response = await fetch(url, {
        ...options,
        credentials: 'include',
      });
    }
  }

  return response;
}
```

## ✅ Testing

### Manual Testing

```bash
# 1. Signup
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# 2. Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 3. Access protected endpoint
curl http://localhost:3001/auth/me \
  -b cookies.txt

# 4. Logout
curl -X POST http://localhost:3001/auth/logout \
  -b cookies.txt
```

### Unit Tests (Jest)

```javascript
const authService = require('./services/authService');

describe('Auth Service', () => {
  test('validates password strength', () => {
    expect(authService.validatePassword('weak').valid).toBe(false);
    expect(authService.validatePassword('Strong123!').valid).toBe(true);
  });

  test('hashes password correctly', async () => {
    const hash = await authService.hashPassword('Test123!');
    expect(hash).not.toBe('Test123!');
    expect(await authService.verifyPassword('Test123!', hash)).toBe(true);
  });
});
```

## 🔒 Security Best Practices

✅ **Implemented:**
- Passwords hashed with bcrypt (12 rounds)
- httpOnly cookies (XSS protection)
- SameSite=Strict (CSRF protection)
- Secure flag on cookies (HTTPS only in production)
- Token rotation on refresh
- Rate limiting on auth endpoints
- Brute force protection
- Account lockout mechanism
- Audit logging
- SQL injection protection (parameterized queries)

❗ **Additional Recommendations:**
- [ ] Enable HTTPS in production
- [ ] Set up Content Security Policy headers
- [ ] Add 2FA (TOTP) for sensitive accounts
- [ ] Implement CAPTCHA after failed attempts
- [ ] Set up monitoring & alerts
- [ ] Regular security audits
- [ ] Keep dependencies updated

## 🐛 Troubleshooting

**Cookies not being set:**
- Check `credentials: 'include'` in fetch requests
- Ensure `CORS_ORIGIN` matches frontend URL
- Set `COOKIE_SECURE=false` in development (http://localhost)

**Token expired errors:**
- Implement automatic token refresh
- Check server/client time sync

**Rate limiting too aggressive:**
- Increase `RATE_LIMIT_MAX_REQUESTS` in development
- Clear rate limit state (restart server or use Redis)

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Check Postgres is running
- Run migrations

## 📚 Next Steps

1. ✅ Complete basic auth (signup, login, logout)
2. ✅ Add token refresh
3. ✅ Implement password reset
4. [ ] Add email verification
5. [ ] Implement Google OAuth
6. [ ] Add 2FA (TOTP)
7. [ ] Add magic link login
8. [ ] Add session management UI
9. [ ] Add security dashboard
10. [ ] Implement webhook for security events
