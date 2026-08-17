# Auth Boilerplate — Development Guide

This document provides detailed guidance for developers extending or maintaining this codebase. AI assistants should also reference this doc when working with the project.

## Core Patterns

### Controller Pattern

Every controller handler is wrapped with `catchAsync` to catch rejections and pass them to the error handler:

```typescript
// GOOD — always wrap async handlers
const createUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.create(req.body);
    sendResponse(res, { httpStatusCode: status.CREATED, success: true, message: "Created", data: result });
});

// BAD — don't use try/catch inside controllers; let catchAsync handle it
const createUser = async (req: Request, res: Response) => {
    try {
        const result = await UserService.create(req.body);
        res.json(result);
    } catch (error) {
        next(error); // wrong — bypasses catchAsync
    }
};
```

### Service Pattern

Services contain all business logic. They should never know about Express `Request`/`Response`:

```typescript
// GOOD — service is framework-agnostic
const createUser = async (data: ICreateUserPayload) => {
    const user = await prisma.user.create({ data });
    return user;
};

// BAD — don't mix HTTP concerns into services
const createUser = async (req: Request) => {
    const user = await prisma.user.create({ data: req.body });
    return user;
};
```

### Validation Pattern

Use Zod schemas for all input validation. Place schemas in `*.validation.ts`:

```typescript
import z from "zod";

export const createUserSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
});
```

Apply in the route with `validateRequest`:

```typescript
router.post("/", validateRequest(createUserSchema), UserController.create);
```

### Response Pattern

Always use `sendResponse` for consistent JSON output:

```typescript
// Success response
sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Operation completed",
    data: result,           // optional
    meta: { page: 1, limit: 10, total: 100, totalPages: 10 },  // optional
});

// Error — throw AppError, don't send directly
throw new AppError(status.BAD_REQUEST, "Invalid input");
```

### Error Pattern

Use `AppError` for known, expected errors. Let unhandled errors fall through to `globalErrorHandler`:

```typescript
import AppError from "../../errorHelpers/AppError.js";
import status from "http-status";

// Valid user-facing error
if (!user) throw new AppError(status.NOT_FOUND, "User not found");

// Always use the http-status constants, not raw numbers
throw new AppError(status.CONFLICT, "Email already registered");
```

## Adding a New Module

Follow the 5-file pattern exactly:

```
src/app/module/<name>/
├── <name>.route.ts
├── <name>.controller.ts
├── <name>.service.ts
├── <name>.validation.ts
└── <name>.interface.ts
```

### File responsibilities

| File | Responsibility |
|---|---|
| `*.route.ts` | Express router, middleware composition, route registration |
| `*.controller.ts` | Thin layer — calls service, sends response via `sendResponse` |
| `*.service.ts` | Business logic, Prisma queries, external API calls |
| `*.validation.ts` | Zod schemas for request body, query params, file uploads |
| `*.interface.ts` | TypeScript interfaces for service payloads and return types |

### Registering a new route

In `src/app/routes/index.ts`:

```typescript
import { ItemRoutes } from "../module/item/item.route.js";
router.use("/item", ItemRoutes);
```

## Authentication Details

### Token Sources

`checkAuth` accepts tokens from two sources (checked in order):

1. `Authorization: Bearer <token>` header
2. `better-auth.session_token` cookie

### Protected Routes

Apply `checkAuth()` to any route that requires authentication:

```typescript
router.get("/me", checkAuth(), UserController.getMe);
router.delete("/user/:id", checkAuth("ADMIN"), UserController.deleteUser);
```

Role-based protection passes role names as arguments:

```typescript
// Only ADMIN role can access
router.delete("/user/:id", checkAuth("ADMIN"), UserController.deleteUser);

// ADMIN or MODERATOR can access
router.patch("/settings", checkAuth("ADMIN", "MODERATOR"), UserController.updateSettings);
```

### Session Cookies

better-auth manages session cookies automatically. Never manually set or read session cookies in your code — use the `Authorization` header instead.

## Rate Limiting

Two limiters are available:

| Limiter | Config | Usage |
|---|---|---|
| `authHardLimiter` | 5 requests / 15 minutes | Applied to all auth routes via `router.use()` |
| `otpLimiter` | 3 requests / 1 hour | Applied to OTP-sensitive endpoints |

```typescript
import { authHardLimiter, otpLimiter } from "../../middleware/authRateLimit.js";

// Apply to entire router
router.use(authHardLimiter);

// Apply to specific endpoints
router.post("/verify-email", otpLimiter, validateRequest(schema), Controller.verify);
```

## Error Handling

### Custom Errors

```typescript
class AppError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string, stack = "") {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
```

### Prisma Errors

Prisma errors are automatically converted to user-friendly responses in `globalErrorHandler`. The mapping is defined in `handlePrismaErrors.ts`. You never need to handle Prisma errors manually.

### Zod Errors

Zod validation errors are caught by `validateRequest` and passed to `globalErrorHandler`, which formats them as structured error sources.

### Logging

- Use `console.error` for errors and warnings
- Never log passwords, tokens, or PII
- The global error handler logs all errors to the console; the client only receives sanitized messages

## File Uploads

Uploads use `multer.memoryStorage()` and send buffers directly to Cloudinary:

```typescript
import { multerUpload } from "../../config/multer.config.js";
import { validateRequestFile } from "../../middleware/validateRequest.js";

// Route definition
router.post("/", multerUpload.single("file"), validateRequestFile(uploadSchema), Controller.upload);

// In controller
const file = req.file as Express.Multer.File;  // guaranteed to exist after middleware
```

The upload service calls `uploadFileToCloudinary(buffer, originalname)` from `cloudinary.config.ts`.

## QueryBuilder

The `QueryBuilder` class provides a chainable API for complex Prisma queries:

```typescript
import { QueryBuilder } from "../utils/QueryBuilder.js";

const result = await new QueryBuilder(prisma.item, req.query, {
    searchableFields: ["name", "description"],
    filterableFields: ["price", "category"],
})
    .search()
    .filter()
    .paginate()
    .sort()
    .include({ category: true })
    .execute();
```

Supported query parameters:

| Param | Description | Example |
|---|---|---|
| `searchTerm` | Full-text search on searchable fields | `?searchTerm=john` |
| `page` | Page number (default: 1) | `?page=2` |
| `limit` | Items per page (default: 10) | `?limit=20` |
| `sortBy` | Field to sort by (default: `createdAt`) | `?sortBy=name` |
| `sortOrder` | `asc` or `desc` (default: `desc`) | `?sortOrder=asc` |
| `fields` | Comma-separated fields to select | `?fields=id,name,email` |
| `include` | Comma-separated relations to include | `?include=category,author` |
| `price[lt]` | Range filter: less than | `?price[lt]=100` |
| `price[gte]` | Range filter: greater than or equal | `?price[gte]=50` |
| `category[in]` | Array filter | `?category[in]=electronics,clothing` |

## Email Templates

Email templates are EJS files located in `src/app/templates/`. The OTP template receives:

```typescript
{ name: string; otp: string }
```

To add a new template:

1. Create `src/app/templates/<name>.ejs`
2. Call `sendEmail()` in your service:

```typescript
import { sendEmail } from "../utils/email.js";

await sendEmail({
    to: user.email,
    subject: "Welcome",
    templateName: "welcome",
    templateData: { name: user.name },
});
```

## TypeScript Conventions

- Use `ZodType<unknown>` for flexible schema parameters
- Use `express.RequestHandler` or explicit arrow function signatures
- Avoid `any` — use `unknown` when the type is truly unknown
- Export interfaces from `*.interface.ts` files, not inline
- Use `??` and `||` appropriately — prefer `??` for null checks

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Throwing `new Error("message")` directly | Use `new AppError(statusCode, "message")` |
| Sending `res.json()` directly in controller | Use `sendResponse(res, {...})` |
| Not wrapping async handlers | Always use `catchAsync(async () => {...})` |
| Using raw status codes (400, 500) | Use `status.BAD_REQUEST`, `status.INTERNAL_SERVER_ERROR` |
| Logging email addresses or tokens | Log generic messages only |
| Manually managing session cookies | Let better-auth handle cookies; read from `Authorization` header |
| Returning Prisma errors to client | Let `globalErrorHandler` format them |
| Using `req.query.foo as string` without validation | Use Zod schema with `z.string()` |

## Useful Commands

```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm build            # Type-check and compile to dist/
pnpm lint             # Run ESLint

# Database
pnpm migrate          # Run pending migrations
pnpm studio           # Open Prisma Studio (GUI)
pnpm push             # Push schema to DB without migrations

# Package management
pnpm add <package>    # Add dependency
pnpm add -D <package> # Add dev dependency
```

## Environment-Specific Behavior

| Behavior | Development | Production |
|---|---|---|
| Cookie `secure` flag | `false` | `true` |
| Cookie `sameSite` | `lax` | `none` |
| Error stack traces in response | Yes | No |
| Full error object in response | Yes | No |
| CSP headers | Active | Active |
| Rate limiting | Active | Active |

## Dependencies Cheat Sheet

| Package | Purpose |
|---|---|
| `better-auth` | Session auth, OAuth, OTP |
| `@prisma/client` | Type-safe database queries |
| `zod` | Runtime type validation |
| `express-rate-limit` | IP-based rate limiting |
| `helmet` | Security HTTP headers |
| `cors` | Cross-origin resource sharing |
| `multer` | Multipart form parsing |
| `cloudinary` | Cloud file storage |
| `nodemailer` | Email delivery |
| `ejs` | Email template engine |
| `redis` | Caching and session storage |
| `cookie-parser` | Cookie parsing |
| `http-status` | Named HTTP status constants |
| `dotenv` | Environment variable loading |
