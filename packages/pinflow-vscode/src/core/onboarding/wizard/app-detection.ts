/**
 * Pure project-shape detection for the in-extension wizard.
 * No vscode, no spawn — real defaults use synchronous Node fs APIs.
 *
 * Returns only apps with a recognized frontend framework. Anything else —
 * Node APIs, CLIs, monorepo wrappers, build outputs, `node_modules` —
 * is filtered out.
 *
 * @module
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export type FrameworkId =
  | 'react-vite'
  | 'vue-vite'
  | 'react-webpack'
  | 'vue-webpack'
  | 'next'
  | 'nuxt'
  | 'other-vite'
  | 'other-webpack';

export interface FrameworkConfig {
  readonly id: FrameworkId;
  readonly label: string;
  readonly package: string;
  readonly configFile: string;
}

export const FRAMEWORKS: readonly FrameworkConfig[] = [
  { id: 'next', label: 'Next.js', package: '@pinflow/next', configFile: 'next.config.ts' },
  { id: 'nuxt', label: 'Nuxt', package: '@pinflow/nuxt', configFile: 'nuxt.config.ts' },
  { id: 'react-vite', label: 'React + Vite', package: '@pinflow/react', configFile: 'vite.config.ts' },
  { id: 'react-webpack', label: 'React + Webpack', package: '@pinflow/react', configFile: 'webpack.config.js' },
  { id: 'vue-vite', label: 'Vue + Vite', package: '@pinflow/vue', configFile: 'vite.config.ts' },
  { id: 'vue-webpack', label: 'Vue + Webpack', package: '@pinflow/vue', configFile: 'webpack.config.js' },
  { id: 'other-vite', label: 'Other (Vite)', package: '@pinflow/transform', configFile: 'vite.config.ts' },
  { id: 'other-webpack', label: 'Other (Webpack)', package: '@pinflow/transform', configFile: 'webpack.config.js' },
] as const;

export function getFrameworkConfig(id: FrameworkId): FrameworkConfig {
  const cfg = FRAMEWORKS.find((f) => f.id === id);
  if (!cfg) throw new Error(`Unknown framework: ${id}`);
  return cfg;
}

export interface DetectedApp {
  readonly path: string;
  readonly framework: FrameworkId;
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

function classifyFramework(pkg: PackageJson): FrameworkId | undefined {
  if (hasDep(pkg, 'next')) return 'next';
  if (hasDep(pkg, 'nuxt')) return 'nuxt';
  if (hasDep(pkg, 'vite') && hasDep(pkg, 'react')) return 'react-vite';
  if (hasDep(pkg, 'vite') && hasDep(pkg, 'vue')) return 'vue-vite';
  if (hasDep(pkg, 'vite')) return 'other-vite';
  if (hasDep(pkg, 'webpack') && hasDep(pkg, 'react')) return 'react-webpack';
  if (hasDep(pkg, 'webpack') && hasDep(pkg, 'vue')) return 'vue-webpack';
  if (hasDep(pkg, 'webpack')) return 'other-webpack';
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
