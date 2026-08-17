# create-universal-auth-app

Scaffold a new [universal-auth-boilerplate](https://github.com/Forhad96/universal-auth-boilerplate) project in seconds.

A production-ready Express 5 + [better-auth](https://better-auth.com) + Prisma + TypeScript backend, ready to go out of the box.

---

## Quick Start

```bash
npx create-universal-auth-app my-api
# or
npm create universal-auth-app@latest my-api
```

That's it — a complete auth-ready backend project is created in your current directory.

---

## What You Get

| Feature | Details |
|---|---|
| **Auth** | better-auth with email/password + Google OAuth + OTP verification |
| **Database** | Prisma ORM with PostgreSQL (`@prisma/adapter-pg`) |
| **Caching** | Redis client (optional, falls back to localhost) |
| **File Upload** | Cloudinary integration via Multer |
| **Validation** | Zod schemas on every endpoint |
| **Security** | Helmet CSP, CORS, rate limiting, prototype pollution protection |
| **Error Handling** | Centralized `globalErrorHandler` with Prisma/Zod error maps |
| **Email** | Nodemailer + EJS templates for OTP delivery |
| **Super Admin** | Auto-seeded on first boot |

---

## Usage

### Basic

```bash
npx create-universal-auth-app <project-name>
```

### Custom Directory

```bash
npx create-universal-auth-app my-api -d /path/to/parent
# Creates /path/to/parent/my-api/
```

### Aliases

```bash
# Short alias
npx cuaa my-api
```

---

## After Scaffolding

```bash
cd my-api
cp .env.example .env          # fill in your secrets
npm install
npx prisma generate           # generate Prisma client
npx prisma migrate dev        # create & run migrations
npm run dev                   # start dev server
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript + generate Prisma client |
| `npm start` | Run production build (`prisma migrate deploy && node dist/...`) |
| `npm run migrate` | Run pending migrations (`prisma migrate dev`) |
| `npm run studio` | Open Prisma Studio GUI |
| `npm run lint` | Run ESLint |

---

## Environment Variables

Required (server crashes if missing):

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | HTTP server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/my-api` |
| `BETTER_AUTH_SECRET` | Session signing secret | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Public API base URL | `http://localhost:5000` |
| `FRONTEND_URL` | Frontend origin (CORS / OAuth) | `http://localhost:5173` |
| `EMAIL_SENDER_SMTP_*` | SMTP credentials (5 vars) | See `.env.example` |
| `CLOUDINARY_*` | Cloudinary upload credentials (4 vars) | See `.env.example` |
| `SUPER_ADMIN_EMAIL` | Super admin seed email | `admin@example.com` |

Optional:

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Enable Google OAuth (both required) |
| `REDIS_URL` | Redis connection string (falls back to localhost) |
| `SUPER_ADMIN_PASSWORD` | Auto-generated if omitted |

See [`.env.example`](https://github.com/Forhad96/universal-auth-boilerplate/blob/main/.env.example) for full reference.

---

## API Endpoints

### Auth (`/api/v1/auth/*`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register with email/password |
| `POST` | `/auth/login` | Login with email/password |
| `POST` | `/auth/logout` | Invalidate session |
| `POST` | `/auth/verify-email` | Verify email via OTP |
| `POST` | `/auth/forget-password` | Request password reset OTP |
| `POST` | `/auth/reset-password` | Reset password via OTP |
| `POST` | `/auth/change-password` | Change current password |
| `PATCH` | `/auth/profile` | Update profile (with image upload) |
| `GET` | `/auth/login/google` | Initiate Google OAuth |
| `GET` | `/auth/oauth/error` | Handle OAuth errors |

### Upload (`/api/v1/upload/*`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload/file` | Upload file to Cloudinary |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check (returns 200 or 503) |

All endpoints are validated with Zod schemas and wrapped with `catchAsync`. Auth-protected routes use `checkAuth()` middleware.

---

## Project Structure

```
my-api/
├── src/
│   ├── app/
│   │   ├── config/          # env, cloudinary, multer config
│   │   ├── errorHelpers/    # AppError, Prisma/Zod error handlers
│   │   ├── interfaces/      # TypeScript types & Request augmentation
│   │   ├── lib/             # better-auth, prisma, redis clients
│   │   ├── middleware/      # checkAuth, validateRequest, error handler
│   │   ├── module/          # feature modules (auth, upload)
│   │   ├── routes/          # route registry
│   │   ├── shared/          # sendResponse, catchAsync
│   │   ├── templates/       # EJS email templates
│   │   └── utils/           # email, QueryBuilder, seed
│   ├── app.ts               # Express app setup
│   └── server.ts            # HTTP server entry
├── prisma/                  # Prisma schema & migrations
├── .env.example             # All env vars with comments
└── package.json
```

---

## Adding a New Module

Follow the **5-file module pattern**:

```
src/app/module/<name>/
├── <name>.route.ts        # Express router
├── <name>.controller.ts   # Request handlers (use catchAsync)
├── <name>.service.ts      # Business logic
├── <name>.validation.ts   # Zod schemas
└── <name>.interface.ts    # TypeScript interfaces
```

Then register routes in `src/app/routes/index.ts`.

---

## Security

| Feature | Implementation |
|---|---|
| Rate Limiting | 5 req/15min on auth routes; 3 req/hr on OTP endpoints |
| CSP | Strict Content-Security-Policy via Helmet |
| Password Policy | 8–128 characters, validated with Zod |
| Input Validation | All request bodies validated before reaching controllers |
| Error Handling | No stack traces or internal details in production responses |
| Cookie Security | `httpOnly`, `secure` (prod), `sameSite` based on env |

---

## Requirements

- **Node.js** ≥ 20.19 or ≥ 22.12
- **PostgreSQL** running locally or remotely
- **Redis** (optional)
- **Cloudinary** account (for file uploads)
- **SMTP** credentials (for OTP emails)

---

## Repository

- **Source:** [github.com/Forhad96/universal-auth-boilerplate](https://github.com/Forhad96/universal-auth-boilerplate)
- **Issues:** [github.com/Forhad96/universal-auth-boilerplate/issues](https://github.com/Forhad96/universal-auth-boilerplate/issues)

---

## License

ISC
