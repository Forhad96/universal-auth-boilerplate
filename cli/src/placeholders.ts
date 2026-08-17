/**
 * All placeholders used in the template.
 * The scaffold step replaces each one with the user-supplied project name slug.
 */
export const PLACEHOLDERS = ["{{PROJECT_NAME}}"] as const;

/**
 * Maps each placeholder to the list of template-file basenames where it appears.
 * The scaffold step reads each of these files after copying and runs the replacement.
 */
export const PLACEHOLDER_TARGETS: Readonly<Record<string, readonly string[]>> = {
  "{{PROJECT_NAME}}": ["package.json", ".env.example", "README.md", "CLAUDE.md", "Dockerfile"],
} as const;

/**
 * Files that should never appear in the scaffolded output.
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
 */
export const EXCLUDED_FILES = ["pnpm-lock.yaml"] as const;
