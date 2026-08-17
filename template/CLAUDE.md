# CLAUDE.md — Project Context for AI Assistants

## Project Overview

**Auth Boilerplate** — A production-ready Express 5 + TypeScript backend with better-auth authentication, Prisma ORM, PostgreSQL, Redis caching, Cloudinary file uploads, and OTP email verification via Nodemailer/EJS.

## Non-Negotiable Rules

1. **Never commit `.env`** — credentials must never leave local files
2. **No custom JWT** — this project uses only better-auth session tokens. Do not suggest adding JWT back in.
3. **No `console.log` with PII** — emails, passwords, tokens must never appear in logs
4. **No raw error objects to clients** — stack traces stay server-side only
5. **Follow the 5-file module pattern** — every new module needs: `*.route.ts`, `*.controller.ts`, `*.service.ts`, `*.validation.ts`, `*.interface.ts`
6. **Always use `catchAsync`** — no unhandled promise rejections in controllers
7. **Always use `sendResponse`** — never call `res.json()` directly in controllers
8. **Always use Zod for validation** — never trust `req.body` without a schema

## Key Architecture Decisions

### Single Auth System
- **better-auth** is the sole authentication mechanism
- Session tokens are passed via `Authorization: Bearer <token>` header or `better-auth.session_token` cookie
- The `checkAuth()` middleware reads the token, calls `auth.api.getSession()`, validates user status/role, and sets `req.user`
- No separate JWT access/refresh token system exists (removed in v2)

### Error Flow
```
Controller → throw AppError(status, message) → globalErrorHandler → structured JSON response
Controller → catchAsync wraps → catches rejections → passes to globalErrorHandler
Service → throws native Error → caught by catchAsync → passed to globalErrorHandler
```

### Request Pipeline
```
Request → helmet → cors → body parsers → cookieParser → better-auth routes → rate limiters
→ checkAuth → validateRequest → controller → sendResponse
```

## File Locations Quick Reference

| Concern | Path |
|---|---|
| App setup | `src/app.ts` |
| Server entry | `src/server.ts` |
| Better-auth config | `src/app/lib/auth.ts` |
| Prisma client | `src/app/lib/prisma.ts` |
| Redis client | `src/app/lib/redis.ts` |
| Env loader | `src/app/config/env.ts` |
| Auth routes | `src/app/module/auth/auth.route.ts` |
| Upload routes | `src/app/module/upload/upload.route.ts` |
| Global error handler | `src/app/middleware/globalErrorHandler.ts` |
| Auth middleware | `src/app/middleware/checkAuth.ts` |
| Rate limiters | `src/app/middleware/authRateLimit.ts` |
| Validation helpers | `src/app/middleware/validateRequest.ts` |
| Response helper | `src/app/shared/sendResponse.ts` |
| Async wrapper | `src/app/shared/catchAsync.ts` |
| Email sender | `src/app/utils/email.ts` |
| QueryBuilder | `src/app/utils/QueryBuilder.ts` |
| Super admin seed | `src/app/utils/seed.ts` |
| OTP email template | `src/app/templates/otp.ejs` |
| Type augmentations | `src/app/interfaces/index.d.ts` |

## Database Models (Prisma)

- **User** — id, name, email, emailVerified, role, status, needPasswordChange, isDeleted, deletedAt, image
- **Session** — id, expiresAt, token, createdAt, ipAddress, userAgent, userId (Cascade delete)
- **Account** — OAuth provider accounts linked to users
- **Verification** — OTP values and email verification tokens

## Adding New Code — Checklist

- [ ] Created all 5 module files following the pattern
- [ ] Zod schema in `*.validation.ts` validates all inputs
- [ ] Controller uses `catchAsync` and `sendResponse`
- [ ] Service has no Express imports (framework-agnostic)
- [ ] Route is registered in `src/app/routes/index.ts`
- [ ] Rate limiter applied if endpoint is auth-sensitive
- [ ] `checkAuth()` applied if endpoint requires authentication
- [ ] No `console.log` with sensitive data
- [ ] No `as any` — use `unknown` instead
- [ ] Build passes with `pnpm build` (zero TypeScript errors)
- [ ] Error messages don't expose internals (table names, DB fields, paths)

## Status Codes Convention

Use the `http-status` package, not bare numbers:

```typescript
import status from "http-status";
// status.OK, status.CREATED, status.BAD_REQUEST, status.UNAUTHORIZED,
// status.FORBIDDEN, status.NOT_FOUND, status.CONFLICT,
// status.INTERNAL_SERVER_ERROR, etc.
```

## Rate Limits

| Limiter | Limit | Applied To |
|---|---|---|
| `authHardLimiter` | 5 req / 15 min | All `/api/v1/auth/*` routes |
| `otpLimiter` | 3 req / 1 hour | `/verify-email`, `/forget-password`, `/reset-password` |

## Password Rules

- Minimum: 8 characters
- Maximum: 128 characters
- Must be validated via Zod before reaching the service layer

## Build & Run Commands

```bash
pnpm dev          # Start dev server with hot reload (tsx watch)
pnpm build        # TypeScript compile + Prisma generate
pnpm start        # Run compiled dist/ version
pnpm lint         # ESLint check
pnpm migrate      # Run pending Prisma migrations
pnpm studio       # Open Prisma Studio GUI
```

## Node.js Requirement

This project requires **Node.js v20.19+**, **v22.12+**, or **v24+**. The `engines` field in package.json enforces this. Use `nvm` or a version manager if your system has an older Node version.
