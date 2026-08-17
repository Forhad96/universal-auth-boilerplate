import { Server } from "http";
import app from "./app.js";
import { envVars } from "./app/config/env.js";
import { prisma } from "./app/lib/prisma.js";
import { seedSuperAdmin } from "./app/utils/seed.js";

let server: Server;

const bootstrap = async () => {
  try {
    const PORT = Number(envVars.PORT) || 5000;

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });

    await seedSuperAdmin().catch(console.error);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} signal received. Shutting down gracefully...`);

  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  await prisma.$disconnect().catch(() => {});
  console.log("HTTP server closed. Prisma connections released.");
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", async (error) => {
  console.error("[uncaughtException]", error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

process.on("unhandledRejection", async (error) => {
  console.error("[unhandledRejection]", error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

bootstrap();