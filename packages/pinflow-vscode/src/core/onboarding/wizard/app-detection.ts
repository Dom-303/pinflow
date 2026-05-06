/**
 * Pure project-shape detection for the in-extension wizard.
 * No vscode, no spawn — real defaults use synchronous Node fs APIs.
 *
 * @remarks
 * Returns only apps with a recognized frontend framework
 * (Vite / Webpack / Next.js / Nuxt). Anything else — Node APIs, CLIs,
 * monorepo wrappers, build outputs, `node_modules` — is filtered out.
 * If a repo has no frontend app at all, this returns `[]` and the wizard
 * falls through to the manual-path branch.
 *
 * @module
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export interface DetectedApp {
  readonly path: string;
  readonly framework: 'vite' | 'webpack' | 'next' | 'nuxt';
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
  const framework = classifyFramework(pkg);
  if (!framework) return undefined;
  return { path: dir, framework };
}

/**
 * Find frontend apps in `cwd` and depth-1/2 sub-folders. An entry is
 * returned only when its `package.json` declares one of vite, webpack,
 * next, or nuxt as a direct dependency.
 *
 * `node_modules`, dotfile-prefixed dirs (`.git`, `.next`, ...) and common
 * build outputs are excluded.
 */
export function detectApps(
  cwd: string,
  deps: AppDetectionDeps = DEFAULT_DEPS,
): DetectedApp[] {
  const results: DetectedApp[] = [];

  const rootPkg = readPackageJson(cwd, deps.readFile);
  const rootFramework = rootPkg ? classifyFramework(rootPkg) : undefined;
  if (rootFramework) {
    results.push({ path: cwd, framework: rootFramework });
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
