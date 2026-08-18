/**
 * After TypeScript compilation, copy the template/ directory into
 * cli/dist/template/.
 *
 * The CLI's scaffold.ts resolves templates from dist/template/ at runtime, so
 * bundling it inside dist/ keeps the published package self-contained.
 */
import { cp, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The CLI package lives at <repo>/cli/. The template is at <repo>/template/.
const cliDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");       // <repo>/cli/
const repoRoot = resolve(cliDir, "..");                                       // <repo>/
const src = resolve(repoRoot, "template");
const dst = resolve(cliDir, "dist", "template");

try {
  await access(src);
} catch {
  console.error(`ERROR: Template source not found at ${src}`);
  console.error("Expected a 'template/' directory at the repo root.");
  process.exit(1);
}

await cp(src, dst, { recursive: true, force: true });
console.log(`Template copied: ${src} → ${dst}`);
