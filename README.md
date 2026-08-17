# Universal Auth Boilerplate

A production-ready authentication boilerplate built with **better-auth**, **Prisma**, **Express 5**, and **TypeScript**. Designed as a drop-in starter for any Node.js backend that needs robust auth out of the box.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Frontend)                          │
│  Sends Bearer token via Authorization header OR                     │
│  sends better-auth.session_token cookie automatically               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────────┐
│                     Express 5 Server                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Middleware Layer                                              │   │
│  │  • helmet()        — Security headers + CSP                 │   │
│  │  │ cors()          — Controlled CORS with credentials       │   │
│  │  ├ express.json()  — Body parser                            │   │
│  │  ├ cookieParser()  — Cookie reader                          │   │
│  │  ├ authHardLimiter — 5 req/15min on all auth routes         │   │
│  │  ├ otpLimiter     — 3 req/hour on OTP endpoints             │   │
│  │  ├ checkAuth()    — Validates bearer token via better-auth  │   │
│  │  ├ validateRequest — Zod schema validation                   │   │
│  │  └ globalErrorHandler — Centralized error handling           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Better-Auth Handler                                          │   │
│  │  POST /api/auth/sign-in/email  — Email/password login        │   │
│  │  POST /api/auth/sign-up/email  — Email/password register     │   │
│  │  GET  /api/auth/callback/google — OAuth callback             │   │
│  │  POST /api/auth/sign-out       — Session invalidation        │   │
│  │  POST /api/auth/session/refresh — Session refresh            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ App Routes (/api/v1)                                         │   │
│  │  POST /auth/login            — Custom login (sets session)   │   │
│  │  POST /auth/register         — Custom registration           │   │
│  │  POST /auth/refresh-token    — (removed — use better-auth)   │   │
│  │  POST /auth/change-password  — Change current password       │   │
│  │  POST /auth/logout           — Clear session cookie          │   │
│  │  POST /auth/verify-email     — Verify email via OTP          │   │
│  │  POST /auth/forget-password  — Request password reset OTP    │   │
│  │  POST /auth/reset-password   — Reset password via OTP        │   │
│  │  GET  /auth/login/google     — Initiate Google OAuth         │   │
│  │  GET  /auth/oauth/error      — Handle OAuth errors           │   │
│  │  PATCH /auth/profile         — Update user profile           │   │
│  │  POST /upload/file           — Upload file to Cloudinary     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    Database & Services                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL   │  │    Redis     │  │       Cloudinary          │  │
│  │  (sessions,  │  │  (caching,   │  │   (file storage)          │  │
│  │   users)     │  │   rate limit)│  │                           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js v20.19+ / v22.12+ / v24+ | JavaScript runtime |
| Framework | Express 5 | HTTP server |
| Auth | better-auth | Session management, OAuth, OTP |
| ORM | Prisma 7.9.1 | Database access |
| Database | PostgreSQL | Primary data store |
| Cache | Redis | Session caching, rate limiting |
| Validation | Zod 4 | Request schema validation |
| Upload | Cloudinary | File storage |
| Email | Nodemailer + EJS | OTP delivery |
| Security | Helmet, CORS, rate-limit | Attack prevention |

## Quick Start

### Prerequisites

- **Node.js** ≥ 20.19 or ≥ 22.12
- **PostgreSQL** running locally or remotely
- **Redis** (optional, for caching/rate limiting)
- **Cloudinary** account (for file uploads)
- **Gmail** or SMTP credentials (for OTP emails)
- **Google Cloud Console** project (optional, for OAuth)

### 1. Clone & Install

```bash
git clone <repository-url>
cd universal-auth-boilerplate
pnpm install
```

### 2. Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment (`development` or `production`) | `development` |
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `BETTER_AUTH_SECRET` | Random secret for session signing | Generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Public base URL of this API | `http://localhost:5000` |
| `FRONTEND_URL` | Frontend origin (for CORS/OAuth) | `http://localhost:5173` |
| `EMAIL_SENDER_*` | SMTP credentials for OTP emails | See `.env.example` |
| `CLOUDINARY_*` | Cloudinary credentials for uploads | See `.env.example` |
| `SUPER_ADMIN_EMAIL` | Super admin seed email | `admin@example.com` |

Optional:

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Enable Google OAuth (both required) |
| `REDIS_URL` | Redis connection string |
| `SUPER_ADMIN_PASSWORD` | Auto-generated if not set |

### 3. Database Setup

```bash
# Generate Prisma client
pnpm generate

# Run migrations
pnpm migrate

# (Optional) Open Prisma Studio
pnpm studio
```

### 4. Start Development Server

```bash
pnpm dev
```

Server starts at `http://localhost:5000`. A super admin user is auto-seeded on first boot.

### 5. Build for Production

```bash
pnpm build
pnpm start
```

## Authentication Flow

### How Auth Works

This boilerplate uses **better-auth** as the single source of truth for authentication. There is no separate JWT system — better-auth's built-in session tokens serve as both session identifiers and bearer tokens.

**Token format:**
```
Authorization: Bearer <session-token>
```
or via cookie:
```
Cookie: better-auth.session_token=<session-token>
```

### Login Flow

1. Client sends `POST /api/v1/auth/login` with email/password
2. Server calls `auth.api.signInEmail()` internally
3. better-auth creates a session and sets the `better-auth.session_token` cookie
4. Server returns the session data (user info) — no JWT needed
5. Client uses the session token in subsequent requests via the `Authorization` header or automatically via cookies

### Refreshing Sessions

better-auth handles session renewal automatically. When a session approaches expiry, the server sends an `X-Session-Refresh` hint. The client should re-authenticate (call `/login` again) to get a fresh session.

### Logout

```typescript
// Clear the session cookie on the server
POST /api/v1/auth/logout
// The session is invalidated server-side and the cookie is cleared
```

## API Reference

### Auth Endpoints

All auth endpoints are under `/api/v1/auth` and protected by rate limiting.

#### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Response: `201 Created`

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Response: `200 OK` — returns session data with user info. The `better-auth.session_token` cookie is set automatically.

#### Change Password

Requires auth.

```http
PATCH /api/v1/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

#### Logout

```http
POST /api/v1/auth/logout
```

Response: `200 OK` — session invalidated, cookie cleared.

#### Verify Email (OTP)

Stricter rate limit: 3 requests per hour.

```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### Forgot Password (Request OTP)

Stricter rate limit: 3 requests per hour.

```http
POST /api/v1/auth/forget-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password (OTP)

Stricter rate limit: 3 requests per hour.

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewPass456!"
}
```

#### Update Profile

Requires auth. Accepts multipart/form-data for image upload.

```http
PATCH /api/v1/auth/profile
Authorization: Bearer <token>
Content-Type: multipart/form-data

name=John%20Doe&image=<file>
```

Response: `200 OK` — returns updated user data.

### Google OAuth

```http
GET /api/v1/auth/login/google?redirect=/dashboard
```

Redirects to Google's consent screen. On completion, redirects back to the frontend with the auth code.

```http
GET /api/v1/auth/oauth/error?error=access_denied
```

Handles OAuth errors and redirects to the frontend.

### Upload

```http
POST /api/v1/upload/file
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<image>
```

Response: `200 OK` — returns `{ url, publicId }`.

### Health Check

```http
GET /health
```

Response: `200 OK` or `503 Degraded` with DB status.

## Middleware Chain

Requests flow through this middleware stack in order:

```
1. helmet()              — Security headers (CSP, X-Frame-Options, etc.)
2. cors()                — CORS with credential support
3. express.json()        — Parse JSON bodies
4. express.urlencoded()  — Parse URL-encoded bodies
5. cookieParser()        — Read cookies
6. /api/auth/*           — better-auth internal routes
7. /api/v1/*             — App routes
8. authHardLimiter       — Rate limit all auth routes (5 req / 15 min)
9. otpLimiter            — Stricter rate limit for OTP endpoints (3 req / hour)
10. checkAuth()          — Validate bearer token, set req.user
11. validateRequest()    — Zod schema validation
12. multerUpload         — File upload handling
```

## Project Structure

```
src/
├── app/
│   ├── config/
│   │   ├── env.ts              — Environment variable loader
│   │   ├── cloudinary.config.ts — Cloudinary upload client
│   │   └── multer.config.ts    — Multer memory storage config
│   ├── errorHelpers/
│   │   ├── AppError.ts         — Custom error class
│   │   ├── handlePrismaErrors.ts — Prisma → user-friendly errors
│   │   └── handleZodError.ts   — Zod validation → structured errors
│   ├── interfaces/
│   │   ├── error.interface.ts  — Error response types
│   │   ├── query.interface.ts  — QueryBuilder types
│   │   ├── requestUser.interface.ts — req.user type
│   │   └── index.d.ts          — Express.Request augmentation
│   ├── lib/
│   │   ├── auth.ts             — better-auth instance configuration
│   │   ├── prisma.ts           — Prisma client singleton
│   │   └── redis.ts            — Redis client singleton
│   ├── middleware/
│   │   ├── authRateLimit.ts    — Rate limiters (hard + OTP)
│   │   ├── checkAuth.ts        — Token validation middleware
│   │   ├── globalErrorHandler.ts — Centralized error handler
│   │   ├── notFound.ts         — 404 handler
│   │   └── validateRequest.ts  — Zod validation wrappers
│   ├── module/
│   │   ├── auth/               — Auth module (controller/service/route/validation/interface)
│   │   └── upload/             — File upload module
│   ├── routes/
│   │   └── index.ts            — Route registry
│   ├── shared/
│   │   ├── catchAsync.ts       — Async wrapper for controllers
│   │   └── sendResponse.ts     — Standardized JSON response helper
│   └── utils/
│       ├── cookie.ts           — Cookie getter/setter/clearer
│       ├── email.ts            — Email sender with EJS templates
│       ├── QueryBuilder.ts     — Generic Prisma query builder
│       └── seed.ts             — Super admin seeding
├── templates/
│   └── otp.ejs                 — OTP email template
├── types/
├── app.ts                      — Express app setup
└── server.ts                   — HTTP server entry point
```

## Security Measures

| Feature | Implementation |
|---|---|
| **CSRF** | `SameSite=lax` (dev) / `sameSite=none` (prod) + `Secure` flag; no custom CSRF token needed since better-auth manages sessions |
| **CORS** | Whitelist origins from `FRONTEND_URL`; credentials enabled; methods restricted |
| **Rate Limiting** | 5 req/15min on auth routes; 3 req/hour on OTP endpoints; Redis-backed in production |
| **CSP** | Strict Content-Security-Policy via Helmet — blocks inline scripts, frames, objects |
| **Password Policy** | Minimum 8 characters, maximum 128 characters |
| **Error Handling** | No stack traces or internal details in production responses; full logs only server-side |
| **Cookie Security** | `httpOnly`, `secure` (prod), proper `sameSite` based on environment |
| **Input Validation** | All request bodies validated with Zod schemas before reaching controllers |
| **Prototype Pollution** | Query parser configured with `allowPrototypes: false` |

## Adding a New Module

The boilerplate follows a consistent 5-file pattern per module:

```
src/app/module/<module>/
├── <module>.route.ts        — Express router with middleware composition
├── <module>.controller.ts   — Request handlers, thin layer
├── <module>.service.ts      — Business logic, thin layer
├── <module>.validation.ts   — Zod schemas for request bodies
└── <module>.interface.ts    — TypeScript interfaces for payloads
```

### Steps to add a new module:

1. Create the 5 files following the pattern above
2. Register routes in `src/app/routes/index.ts`
3. Add middleware (rate limiting, auth) as needed
4. Add Zod validation schemas in `<module>.validation.ts`
5. Define interfaces in `<module>.interface.ts`

Example:

```typescript
// module.route.ts
import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ItemController } from "./item.controller.js";
import { createItemSchema } from "./item.validation.js";

const router = Router();
router.post("/", checkAuth("ADMIN"), validateRequest(createItemSchema), ItemController.create);
export const ItemRoutes = router;
```

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errorSources": [
    { "path": "email", "message": "Invalid email address" }
  ]
}
```

In development, you can also see the full error object in the server console. The response never includes stack traces or internal details.

## Contributing

1. Follow the existing 5-file module pattern
2. Use Zod for all input validation
3. Wrap async controllers with `catchAsync`
4. Use `sendResponse` for standardized JSON responses
5. No raw `console.log` with sensitive data — use `console.error` for errors only
6. Run `pnpm build` before committing — zero TypeScript errors required
