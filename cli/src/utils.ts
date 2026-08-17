import { readFileSync, writeFileSync } from "node:fs";
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
    .replace(/[^a-z0-9]+/g, "-") // replace any non-alphanumeric run with single hyphen
    .replace(/^-|-$/g, "");       // trim leading/trailing hyphens
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

/**
 * Deep-copy a source directory to a destination directory,
 * skipping entries in the exclude list (by basename).
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
    } else {
      mkdirSync(path.dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
}

// --- thin wrappers around node:fs so we stay ESM-friendly ---
import {
  readdirSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  readFileSync as rf,
  writeFileSync as wf,
} from "node:fs";

function readdirSyncWithTypes(dir: string): { name: string; isDirectory: boolean }[] {
  return readdirSync(dir, { withFileTypes: true }).map((d) => ({
    name: d.name,
    isDirectory: d.isDirectory(),
  }));
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function fileExists(p: string): boolean {
  return existsSync(p);
}

export function readFile(p: string): string {
  return rf(p, "utf-8");
}

export function writeFile(p: string, content: string): void {
  mkdirSync(path.dirname(p), { recursive: true });
  wf(p, content, "utf-8");
}

export function removeFile(p: string): void {
  if (existsSync(p)) {
    rf(p); // no-op just to confirm it's readable
    require("node:fs").unlinkSync(p);
  }
}
