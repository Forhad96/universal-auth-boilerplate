// Prisma CLI configuration.
// Intentionally does NOT import src/app/config/env — that module validates all
// runtime env vars at import time and would throw during `prisma generate` in
// the Docker builder stage, where no .env is present.
import "dotenv/config";
import { defineConfig } from "prisma/config";

// NOTE: this file is ESM (package.json has "type": "module") and is loaded by
// the prisma CLI. It must NOT import src/app/config/env — that module validates
// all runtime env vars and would throw during `prisma generate` where no .env
// exists.

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
