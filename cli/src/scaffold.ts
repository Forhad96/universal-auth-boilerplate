import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  copyRecursive,
  readFile,
  writeFile,
  fileExists,
  ensureDir,
} from "./utils.js";
import { PLACEHOLDER_TARGETS, EXCLUDED_DIRS, EXCLUDED_FILES } from "./placeholders.js";

/**
 * Resolve the absolute path to the template directory.
 *
 * After publish: dist/template/ (copied by copy-template.mjs during build)
 * During local dev: ../../template/ (the source template in the repo)
 */
function resolveTemplateDir(): string {
  const distDir = path.dirname(fileURLToPath(import.meta.url)); // cli/dist/
  const bundledTemplate = path.join(distDir, "template");       // dist/template/
  const cliDir = path.join(distDir, "..");                       // cli/
  const repoTemplate = path.join(cliDir, "..", "template");     // ../template/

  if (fileExists(bundledTemplate)) {
    return bundledTemplate;
  }

  if (fileExists(repoTemplate)) {
    return repoTemplate;
  }

  throw new Error(
    `Template directory not found. Expected dist/template/ (published) or ../template/ (dev).\n` +
    `Run \`npm run build\` first if publishing locally.`
  );
}

/**
 * Replace all placeholders in the given file content with the project slug.
 */
function replaceInFile(filePath: string, slug: string): void {
  const content = readFile(filePath);
  const replaced = Object.entries(PLACEHOLDER_TARGETS).reduce(
    (result, [placeholder, targets]) => {
      // Only replace if this file is listed as a target for any placeholder
      const baseName = path.basename(filePath);
      const isTarget = targets.includes(baseName);
      return isTarget ? result.replaceAll(placeholder, slug) : result;
    },
    content
  );

  if (replaced !== content) {
    writeFile(filePath, replaced);
  }
}

/**
 * Main scaffolding function.
 *
 * @param slug        — the sanitized kebab-case project name (e.g. "my-awesome-api")
 * @param targetDir   — absolute path where the new project will be created
 */
export async function scaffold(slug: string, targetDir: string): Promise<{ message: string }> {
  const templateDir = resolveTemplateDir();

  // Ensure target parent exists
  ensureDir(path.dirname(targetDir));

  if (fileExists(targetDir)) {
    throw new Error(`Target directory already exists: ${targetDir}`);
  }

  // Step 1 — Copy template → target
  copyRecursive(templateDir, targetDir, [...EXCLUDED_DIRS, ...EXCLUDED_FILES]);

  // Step 2 — Replace placeholders in all target files
  const targetRoot = targetDir;
  for (const [, targets] of Object.entries(PLACEHOLDER_TARGETS)) {
    for (const fileName of targets) {
      const filePath = path.join(targetRoot, fileName);
      if (fileExists(filePath)) {
        replaceInFile(filePath, slug);
      }
    }
  }

  // Step 3 — Remove excluded files that might have been included accidentally
  for (const excludedFile of EXCLUDED_FILES) {
    const filePath = path.join(targetRoot, excludedFile);
    if (fileExists(filePath)) {
      require("node:fs").unlinkSync(filePath);
    }
  }

  // Step 4 — Remove .env if it somehow made it in
  const envPath = path.join(targetRoot, ".env");
  if (fileExists(envPath)) {
    require("node:fs").unlinkSync(envPath);
  }

  return {
    message: [
      `\n  ${slug}`,
      `  Project scaffolded to: ${targetDir}`,
      "",
      `  Next steps:`,
      `    cd ${path.basename(targetDir)}`,
      `    cp .env.example .env   # then fill in your secrets`,
      `    npm install`,
      `    npx prisma generate`,
      `    npx prisma migrate dev`,
      `    npm run dev`,
      "",
    ].join("\n"),
  };
}
