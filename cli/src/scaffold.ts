import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  copyRecursive,
  readFile,
  writeFile,
  fileExists,
  ensureDir,
} from "./utils.js";
import { PLACEHOLDER_TARGETS, EXCLUDED_DIRS, EXCLUDED_FILES, BINARY_EXTENSIONS } from "./placeholders.js";

/**
 * Resolve the absolute path to the template directory.
 *
 * Resolution order:
 *   1. cli/dist/template/  — bundled by copy-template.mjs during npm publish
 *   2. cli/template/       — copy-template.mjs target when building locally
 *   3. ../../template/     — source template in the monorepo (local dev)
 */
function resolveTemplateDir(): string {
  const distDir = path.dirname(fileURLToPath(import.meta.url)); // cli/dist/
  const bundled = path.join(distDir, "template");               // cli/dist/template/ (published)
  const cliDir  = path.join(distDir, "..");                     // cli/
  const cliTemplate = path.join(cliDir, "template");            // cli/template/ (post-build copy)
  const repo    = path.join(cliDir, "..", "template");          // repo/template/ (dev)

  if (fileExists(bundled)) return bundled;
  if (fileExists(cliTemplate)) return cliTemplate;
  if (fileExists(repo))    return repo;

  throw new Error(
    `Template directory not found.\n` +
    `Expected cli/dist/template/ (bundled), cli/template/ (post-build), or\n` +
    `../../template/ (monorepo). Run \`npm run build\` inside cli/ first.`
  );
}

/**
 * Given the resolved template dir, return the flavor-specific folder if any.
 * For example `template-minimal/` next to `template/`.
 * Supports future `template-<flavor>/` subdirectories without breaking the default.
 */
function resolveFlavorDir(base: string, flavor?: string): string {
  if (flavor) {
    // Use path.dirname(base) to navigate out of base before appending the
    // flavored folder name.  Avoids fragile `..` segments that break when
    // base has trailing separators or other edge-case paths.
    const flavored = path.join(path.dirname(base), `template-${flavor}`);
    if (fileExists(flavored)) return flavored;
    if (fileExists(base)) return base;
    throw new Error(
      `Template flavor "${flavor}" not found.\n` +
      `Searched:\n` +
      `  - ${flavored}\n` +
      `  - ${base}`
    );
  }
  if (fileExists(base)) return base;
  throw new Error(`Template not found at: ${base}`);
}

/**
 * Replace all placeholders in a single text file with the project slug.
 * Returns true if the file was modified, false otherwise.
 *
 * Binary extensions are skipped so .svg, .ico, .woff, etc. are never corrupted.
 */
function replaceInFile(filePath: string, slug: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return false;

  const content = readFile(filePath);
  let replaced = content;
  let changed = false;

  for (const [placeholder, targets] of Object.entries(PLACEHOLDER_TARGETS)) {
    const baseName = path.basename(filePath);
    if (!targets.includes(baseName)) continue;
    if (content.includes(placeholder)) {
      replaced = replaced.replaceAll(placeholder, slug);
      changed = true;
    }
  }

  if (changed && replaced !== content) {
    writeFile(filePath, replaced);
    return true;
  }
  return false;
}

/**
 * Detect package manager from the lockfile in the target directory.
 * Tries pnpm > bun > yarn > npm (default).
 */
function detectPackageManager(targetDir: string): {
  name: string;
  installCmd: string;
  runCmd: string;
} {
  if (fileExists(path.join(targetDir, "pnpm-lock.yaml"))) {
    return { name: "pnpm", installCmd: "pnpm install", runCmd: "pnpm" };
  }
  if (fileExists(path.join(targetDir, "bun.lockb")) || fileExists(path.join(targetDir, "bun.lock"))) {
    return { name: "bun", installCmd: "bun install", runCmd: "bun" };
  }
  if (fileExists(path.join(targetDir, "yarn.lock"))) {
    return { name: "yarn", installCmd: "yarn install", runCmd: "yarn" };
  }
  return { name: "npm", installCmd: "npm install", runCmd: "npm" };
}

/**
 * Ask the user a yes/no question via stdin.
 */
async function askYesNo(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${prompt} [y/N] `, (a) => resolve(a.trim()));
    rl.close();
  });
  return /^(y|yes)$/i.test(answer);
}

export interface ScaffoldOptions {
  /** Flavor name — resolves to template-<flavor>/ if it exists */
  template?: string;
  /** Skip the auto-install dependency step */
  noInstall?: boolean;
  /** Overwrite targetDir silently if it already exists */
  force?: boolean;
}

export async function scaffold(
  slug: string,
  targetDir: string,
  options: ScaffoldOptions = {}
): Promise<{ message: string }> {
  const templateDir = resolveTemplateDir();
  const finalDir    = resolveFlavorDir(templateDir, options.template);

  ensureDir(path.dirname(targetDir));

  if (fileExists(targetDir)) {
    if (!options.force) {
      const willOverwrite = await askYesNo(
        `Target directory already exists (${path.basename(targetDir)}). Overwrite?`
      );
      if (!willOverwrite) {
        throw new Error(`Aborted: target directory already exists: ${targetDir}`);
      }
    }
  }

  // Step 1 — Copy template → target
  copyRecursive(finalDir, targetDir, [...EXCLUDED_DIRS, ...EXCLUDED_FILES]);

  // Step 2 — Replace placeholders in whitelisted text files
  for (const [placeholder, targets] of Object.entries(PLACEHOLDER_TARGETS)) {
    for (const fileName of targets) {
      const filePath = path.join(targetDir, fileName);
      if (fileExists(filePath)) {
        replaceInFile(filePath, slug);
      }
    }
  }

  // Step 3 — Verify no placeholders were left behind
  const unreplaced: Array<{ file: string; placeholders: string[] }> = [];
  for (const [placeholder, targets] of Object.entries(PLACEHOLDER_TARGETS)) {
    for (const fileName of targets) {
      const filePath = path.join(targetDir, fileName);
      if (!fileExists(filePath)) continue;
      if (BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase())) continue;
      try {
        const content = readFile(filePath);
        if (content.includes(placeholder)) {
          unreplaced.push({
            file: path.relative(targetDir, filePath),
            placeholders: [placeholder],
          });
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  if (unreplaced.length > 0) {
    console.warn("\n  ⚠  Warning: unreplaced placeholders remain:");
    for (const item of unreplaced) {
      console.warn(`    ${item.file}: ${item.placeholders.join(", ")}`);
    }
    console.warn(
      `  If this is unexpected, please report it with the file and placeholder name.\n`
    );
  }

  // Step 4 — Remove lockfiles (user will regenerate for their own PM)
  for (const lockFile of EXCLUDED_FILES) {
    const lockPath = path.join(targetDir, lockFile);
    if (fileExists(lockPath)) {
      unlinkSync(lockPath);
    }
  }

  // Step 5 — Strip .env if it somehow landed in the copy (never ship secrets)
  const envPath = path.join(targetDir, ".env");
  if (fileExists(envPath)) {
    unlinkSync(envPath);
    console.log(`  Stripped .env (secret file removed from scaffolded output)`);
  }

  // Step 6 — Auto-install dependencies (unless --no-install)
  const pm = detectPackageManager(targetDir);
  let installSteps: string[] = [];
  if (!options.noInstall) {
    try {
      console.log(`\n  Installing dependencies with ${pm.name}...`);
      execSync(pm.installCmd, { cwd: targetDir, stdio: "ignore" });
      console.log(`  ✓ Dependencies installed`);
    } catch (err) {
      const shortMsg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      console.warn(`  ⚠  Dependency install failed (${shortMsg}). Run it manually.`);
      installSteps = [`    ${pm.installCmd}`];
    }
  } else {
    installSteps = [`    ${pm.installCmd}`];
  }

  // Step 7 — Assemble success / next-steps message
  return {
    message: [
      `\n  ${slug}`,
      `  Project scaffolded to: ${targetDir}`,
      "",
      `  Next steps:`,
      `    cd ${path.basename(targetDir)}`,
      `    cp .env.example .env   # then fill in your secrets`,
      ...installSteps,
      `    npx prisma generate`,
      `    npx prisma migrate dev`,
      `    ${pm.runCmd} run dev`,
      "",
    ].join("\n"),
  };
}
