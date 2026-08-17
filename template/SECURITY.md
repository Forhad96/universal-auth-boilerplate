# Security Documentation

## Security Measures in Place

### 1. Authentication & Session Management

| Control | Implementation |
|---|---|
| Session storage | better-auth with PostgreSQL-backed sessions |
| Token delivery | Bearer token in `Authorization` header or `better-auth.session_token` cookie |
| Cookie security | `httpOnly: true`, `secure: true` (prod), `sameSite: none` (prod) / `lax` (dev) |
| Session expiry | 1 day (configurable in `src/app/lib/auth.ts`) |
| Brute-force protection | `authHardLimiter` — 5 requests per 15 minutes on all auth routes |
| OTP bombing protection | `otpLimiter` — 3 requests per hour on `/verify-email`, `/forget-password`, `/reset-password` |
| Password policy | Minimum 8 characters, maximum 128 characters (enforced by Zod) |

### 2. Transport Security

| Control | Implementation |
|---|---|
| HTTPS enforcement | `secure: true` on all cookies in production |
| CORS | Origin whitelist from `FRONTEND_URL` and `BETTER_AUTH_URL`; credentials enabled |
| HSTS | Handled by reverse proxy (Coolify/Traefik) — not configured at app level |

### 3. Request Security

| Control | Implementation |
|---|---|
| Security headers | Helmet.js — CSP, X-Frame-Options, X-Content-Type-Options, etc. |
| Content-Security-Policy | `default-src 'self'`, scripts/styles blocked from external sources, no frames |
| Input validation | Zod schemas on every request body endpoint |
| Query parser | `qs` with `allowPrototypes: false` — prevents prototype pollution |
| CSRF protection | `SameSite` cookie attributes + better-auth's built-in state cookies |
| File upload validation | Size limit (5 MB) enforced by Zod; buffer sent directly to Cloudinary |

### 4. Error Handling Security

| Control | Implementation |
|---|---|
| Stack traces | Never sent to client — logged server-side only |
| Internal errors | Generic message (`"Internal Server Error"`) returned to client |
| Prisma errors | Database table/column names stripped before client response |
| Validation errors | Field-level messages only — no SQL or schema details exposed |

### 5. Data Protection

| Control | Implementation |
|---|---|
| Passwords | Hashed by better-auth (bcrypt/argon2) — never stored in plaintext |
| Email in logs | Removed from all `console.log` calls |
| Sensitive tokens | Never written to console or response bodies |
| Database credentials | Loaded from `.env`, never hardcoded |

## Known Security Considerations

### `sameSite: none` in Production

The session cookie uses `sameSite: "none"` in production to support cross-origin API calls from the frontend. This is intentional but requires:

- **HTTPS everywhere** — the `secure` flag ensures cookies are never sent over unencrypted connections
- **Reverse proxy** — the app sits behind Coolify's TLS termination, so all traffic to clients is HTTPS
- **No mixed content** — ensure the frontend also runs over HTTPS

If the frontend and backend share the same origin (e.g., `api.example.com` and `app.example.com` are on the same domain), consider changing to `sameSite: "strict"` for stronger CSRF protection.

### Rate Limiting Scope

Rate limiters are currently IP-based (in-memory). In a multi-instance deployment behind a load balancer:

- Each instance has its own rate limit counter
- Consider switching to a Redis-backed rate limiter for accurate cross-instance limits

To implement: replace `express-rate-limit` with `rate-limit-redis` and update `authRateLimit.ts`.

### OTP Expiry

OTP codes expire after **2 minutes** (configured in `src/app/lib/auth.ts`). This is intentionally short to limit the window for interception.

## OWASP Top 10 Coverage

| OWASP Category | Status | How It's Addressed |
|---|---|---|
| A01 Broken Access Control | ✅ Covered | Role-based checks in `checkAuth()`, CORS whitelist, session validation |
| A02 Cryptographic Failures | ✅ Covered | better-auth handles password hashing; TLS enforced via `secure` cookie flag |
| A03 Injection | ✅ Covered | Prisma parameterized queries; Zod input validation; no raw SQL in app code |
| A04 Insecure Design | ✅ Covered | Single auth system (no dual JWT/session confusion); defense-in-depth middleware chain |
| A05 Security Misconfiguration | ✅ Covered | Helmet CSP; prototype-safe query parser; environment-aware security flags |
| A06 Vulnerable Components | ⚠️ Monitor | Run `pnpm audit` regularly; pin dependency versions |
| A07 Auth Failures | ✅ Covered | Rate limiting, OTP expiry, brute-force protection, session invalidation on password change |
| A08 Software Data Integrity | ✅ Covered | `httpOnly` cookies prevent JS access; CSP prevents script injection |
| A09 Logging Failures | ✅ Covered | PII removed from logs; errors logged server-side only; no sensitive data in responses |
| A10 SSRF | ⚠️ Limited | Cloudinary URLs are internal; no user-controlled URL fetching |

## Incident Response Checklist

If you suspect a security issue:

1. **Rotate secrets immediately** — `BETTER_AUTH_SECRET`, `DATABASE_URL`, SMTP credentials, Cloudinary keys
2. **Invalidate all sessions** — run `DELETE FROM "session";` in the database
3. **Check logs** — `grep "Error\|Unauthorized\|Forbidden" dist/src/server.js` or check your log aggregator
4. **Revoke OAuth tokens** — if Google OAuth is compromised, revoke in Google Cloud Console
5. **Update dependencies** — `pnpm audit fix` and review changelogs for security advisories
6. **Document** — record what happened, what was rotated, and what changed

## Running Security Audits

```bash
# Check for known vulnerabilities in dependencies
pnpm audit

# Review updated dependencies after fixes
pnpm audit --prod

# Optional: run automated security scan
npx snyk test
```
