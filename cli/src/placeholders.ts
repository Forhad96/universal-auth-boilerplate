/**
 * Maps each placeholder to the list of template-file basenames where it appears.
 * The scaffold step reads each of these files after copying and runs the replacement.
 */
export const PLACEHOLDER_TARGETS: Readonly<Record<string, readonly string[]>> = {
  "{{PROJECT_NAME}}": ["package.json", ".env.example", "README.md", "CLAUDE.md", "Dockerfile"],
} as const;

/**
 * File extensions treated as binary — skipped during text-based placeholder
 * replacement so that .svg, .ico, .woff, .wasm, etc. are never corrupted by
 * a naive UTF-8 replace-all.
 */
export const BINARY_EXTENSIONS = new Set([
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".svg",
  ".wasm",
  ".zip",
  ".tar",
  ".gz",
  ".lock",
]);

/**
 * Directories skipped when copying the template into the scaffolded output.
 */
export const EXCLUDED_DIRS = [
  "node_modules",
  "dist",
  ".git",
  ".claude",
  "Tasks",
  "agent-customization",
] as const;

/**
 * Files in the root of template/ that are excluded from the scaffold output.
 * These are typically generated/repo-local files that should be regenerated
 * by the user after scaffolding.
 */
export const EXCLUDED_FILES = ["pnpm-lock.yaml"] as const;
