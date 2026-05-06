/**
 * Pure project-shape detection for the in-extension wizard.
 * No vscode, no spawn — real defaults use synchronous Node fs APIs.
 * @module
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export interface DetectedApp {
  readonly path: string;
  readonly framework?: 'vite' | 'webpack' | 'next' | 'nuxt';
}

/** Injected dependencies — defaults to real Node fs. Test-overridable. */
export interface AppDetectionDeps {
  readonly readFile: (p: string) => string | undefined;
  readonly readdir: (p: string) => string[];
}

const DEFAULT_DEPS: AppDetectionDeps = {
  readFile: (p) => {
    try {
      return readFileSync(p, 'utf-8');
    } catch {
      return undefined;
    }
  },
  readdir: (p) => {
    try {
      return readdirSync(p, { withFileTypes: false }) as unknown as string[];
    } catch {
      return [];
    }
  },
};

interface PackageJson {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

function hasDep(pkg: PackageJson, name: string): boolean {
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

function classifyFramework(
  pkg: PackageJson,
): DetectedApp['framework'] | undefined {
  if (hasDep(pkg, 'next')) return 'next';
  if (hasDep(pkg, 'nuxt')) return 'nuxt';
  if (hasDep(pkg, 'vite')) return 'vite';
  if (hasDep(pkg, 'webpack')) return 'webpack';
  return undefined;
}

function readPackageJson(
  dir: string,
  readFile: AppDetectionDeps['readFile'],
): PackageJson | undefined {
  const content = readFile(path.join(dir, 'package.json'));
  if (content === undefined) return undefined;
  try {
    return JSON.parse(content) as PackageJson;
  } catch {
    return undefined;
  }
}

function tryDetect(
  dir: string,
  deps: AppDetectionDeps,
): DetectedApp | undefined {
  const pkg = readPackageJson(dir, deps.readFile);
  if (!pkg) return undefined;
  return { path: dir, framework: classifyFramework(pkg) };
}

/**
 * Find package.json files at `cwd` and depth-1 sub-folders, classify each
 * by framework, and return a flat list of detected apps.
 */
export function detectApps(
  cwd: string,
  deps: AppDetectionDeps = DEFAULT_DEPS,
): DetectedApp[] {
  const results: DetectedApp[] = [];

  // Check cwd itself
  const root = tryDetect(cwd, deps);
  if (root) results.push(root);

  // Check depth-1 subdirectories
  for (const entry of deps.readdir(cwd)) {
    const subdir = path.join(cwd, entry);
    const sub = tryDetect(subdir, deps);
    if (sub) {
      results.push(sub);
      continue;
    }

    // Check depth-2 subdirectories (e.g. packages/a, packages/b)
    for (const child of deps.readdir(subdir)) {
      const childDir = path.join(subdir, child);
      const detected = tryDetect(childDir, deps);
      if (detected) results.push(detected);
    }
  }

  return results;
}
