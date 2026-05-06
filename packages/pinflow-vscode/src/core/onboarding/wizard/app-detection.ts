/**
 * Pure project-shape detection for the in-extension wizard.
 * No vscode, no spawn — real defaults use synchronous Node fs APIs.
 *
 * @remarks
 * Skips `node_modules`, dotfile-prefixed dirs (`.git`, `.next`, ...) and
 * common build outputs (`dist`, `build`, `out`, `coverage`). When the root
 * `package.json` declares `workspaces` and itself has no frontend framework,
 * the root is omitted from the result — it's a monorepo wrapper, not an app.
 *
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
  readonly workspaces?: readonly string[] | { readonly packages?: readonly string[] };
}

const SKIP_DIR_NAMES: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
]);

function shouldSkipDir(name: string): boolean {
  if (name.startsWith('.')) return true;
  return SKIP_DIR_NAMES.has(name);
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

function hasWorkspaces(pkg: PackageJson | undefined): boolean {
  const ws = pkg?.workspaces;
  if (!ws) return false;
  if (Array.isArray(ws)) return ws.length > 0;
  // ws is the legacy yarn-classic shape: { packages?: string[] }
  const packages = (ws as { packages?: readonly string[] }).packages;
  return Array.isArray(packages) && packages.length > 0;
}

/**
 * Find package.json files at `cwd` and depth-1/2 sub-folders, classify each
 * by framework, and return a flat list of detected apps.
 *
 * Excludes `node_modules`, dotfile-prefixed dirs (`.git`, `.next`, ...) and
 * common build outputs. When the root declares `workspaces` and is not itself
 * a frontend app, the root is omitted from the result.
 */
export function detectApps(
  cwd: string,
  deps: AppDetectionDeps = DEFAULT_DEPS,
): DetectedApp[] {
  const results: DetectedApp[] = [];

  const rootPkg = readPackageJson(cwd, deps.readFile);
  const rootIsMonorepoWrapper =
    hasWorkspaces(rootPkg) && classifyFramework(rootPkg ?? {}) === undefined;

  if (rootPkg && !rootIsMonorepoWrapper) {
    results.push({ path: cwd, framework: classifyFramework(rootPkg) });
  }

  for (const entry of deps.readdir(cwd)) {
    if (shouldSkipDir(entry)) continue;
    const subdir = path.join(cwd, entry);
    const sub = tryDetect(subdir, deps);
    if (sub) {
      results.push(sub);
      continue;
    }

    for (const child of deps.readdir(subdir)) {
      if (shouldSkipDir(child)) continue;
      const childDir = path.join(subdir, child);
      const detected = tryDetect(childDir, deps);
      if (detected) results.push(detected);
    }
  }

  return results;
}
