import {
  readFileSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import path from "node:path";

/**
 * Convert any project name string to a kebab-case slug.
 * "My App"       → "my-app"
 * "My_App"       → "my-app"
 * "myapp"        → "myapp"
 * "MYAPP"        → "myapp"
 */
export function toKebabCase(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validate a project name and return its sanitized kebab-case form.
 * Rejects names that would produce an empty slug or start with a number.
 */
export function validateProjectName(name: string): string {
  const raw = name.trim();
  if (!raw) {
    throw new Error("Project name cannot be empty.");
  }

  const slug = toKebabCase(raw);
  if (!slug) {
    throw new Error(
      `Invalid project name "${raw}". Use only letters, numbers, spaces, or underscores.`
    );
  }

  if (/^[0-9]/.test(slug)) {
    throw new Error(
      `Project name cannot start with a number. Use "${slug}" or a different name.`
    );
  }

  return slug;
}

function readdirSyncWithTypes(dir: string): { name: string; isDirectory: boolean; isSymbolicLink: boolean }[] {
  return readdirSync(dir, { withFileTypes: true }).map((d) => ({
    name: d.name,
    isDirectory: d.isDirectory(),
    isSymbolicLink: d.isSymbolicLink(),
  }));
}

/**
 * Deep-copy a source directory to a destination directory,
 * skipping entries in the exclude list (by basename).
 * Symlinks are skipped to avoid following external links or duplicating targets.
 */
export function copyRecursive(
  src: string,
  dest: string,
  exclude: string[] = []
): void {
  const entries = readdirSyncWithTypes(src);

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (exclude.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory) {
      mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath, exclude);
    } else if (!entry.isSymbolicLink) {
      mkdirSync(path.dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function fileExists(p: string): boolean {
  return existsSync(p);
}

export function readFile(p: string): string {
  return readFileSync(p, "utf-8");
}

export function writeFile(p: string, content: string): void {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, content, "utf-8");
}
