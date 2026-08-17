/* eslint-disable @typescript-eslint/no-explicit-any */
import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import path from "path";
import qs from "qs";
import helmet from "helmet";
import { envVars } from "./app/config/env.js";
import { auth } from "./app/lib/auth.js";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler.js";
import { notFound } from "./app/middleware/notFound.js";
import { IndexRoutes } from "./app/routes/index.js";
import { prisma } from "./app/lib/prisma.js";

const app: Application = express();

// ─── Security headers ────────────────────────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "cloudinary.com"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
            },
        },
    }),
);

// ─── Trust proxy (behind reverse proxy) ──────────────────────────────────────
app.set("trust proxy", 1);

// ─── Query parser — disable prototype pollution ──────────────────────────────
app.set("query parser", (str: string) => qs.parse(str, { allowPrototypes: false }));

// ─── Views ───────────────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), "src/app/templates"));

// ─── CORS — allow localhost origins only in development ───────────────────────
const allowedOrigins = [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL];
if (envVars.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000", "http://localhost:5000");
}

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    }),
);

// ─── Body parsers — must run BEFORE better-auth handler ──────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Better-auth handler ─────────────────────────────────────────────────────
app.use("/api/auth", toNodeHandler(auth));

// ─── App routes ──────────────────────────────────────────────────────────────
app.use("/api/v1", IndexRoutes);

// ─── Root route ──────────────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});

// ─── Health check with dependency status ─────────────────────────────────────
app.get("/health", async (_req: Request, res: Response) => {
    let dbStatus = "ok";
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        dbStatus = "fail";
    }

    const status = dbStatus === "ok" ? "ok" : "degraded";
    res.status(status === "ok" ? 200 : 503).json({
        status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: { db: dbStatus },
    });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
