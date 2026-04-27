import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { FrameworkId } from './types.js';
import { FRAMEWORKS } from './types.js';

export type PinFlowSetupStatus = 'configured' | 'partial' | 'not_configured';

export interface FrontendAppCandidate {
  readonly appRoot: string;
  readonly absolutePath: string;
  readonly framework: FrameworkId;
  readonly status: PinFlowSetupStatus;
  readonly missing: readonly string[];
  readonly reason: string;
}

interface PackageJson {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

const IGNORED_DIRS = new Set([
  '.git',
  '.nx',
  'dist',
  'node_modules',
  'tmp',
  'coverage',
]);

function readPackageJson(appPath: string): PackageJson | undefined {
  const packagePath = path.join(appPath, 'package.json');
  if (!existsSync(packagePath)) return undefined;

  try {
    return JSON.parse(readFileSync(packagePath, 'utf-8')) as PackageJson;
  } catch {
    return undefined;
  }
}

function hasDependency(pkg: PackageJson | undefined, name: string): boolean {
  return Boolean(pkg?.dependencies?.[name] ?? pkg?.devDependencies?.[name]);
}

function detectFrameworkReason(framework: FrameworkId): string {
  switch (framework) {
    case 'next':
      return 'dependency "next"';
    case 'nuxt':
      return 'dependency "nuxt"';
    case 'react-vite':
      return 'dependencies "react" and "vite"';
    case 'react-webpack':
      return 'dependency "react"';
    case 'vue-vite':
      return 'dependencies "vue" and "vite"';
    case 'vue-webpack':
      return 'dependency "vue"';
    case 'other-vite':
      return 'dependency "vite"';
    case 'other-webpack':
      return 'dependency "webpack"';
  }
}

export function detectFrameworkForApp(
  appPath: string,
): FrameworkId | undefined {
  const pkg = readPackageJson(appPath);
  if (!pkg) return undefined;

  if (hasDependency(pkg, 'next')) return 'next';
  if (hasDependency(pkg, 'nuxt')) return 'nuxt';
  if (hasDependency(pkg, 'react') && hasDependency(pkg, 'vite')) {
    return 'react-vite';
  }
  if (hasDependency(pkg, 'vue') && hasDependency(pkg, 'vite')) {
    return 'vue-vite';
  }
  if (hasDependency(pkg, 'react')) return 'react-webpack';
  if (hasDependency(pkg, 'vue')) return 'vue-webpack';
  if (hasDependency(pkg, 'vite')) return 'other-vite';
  if (hasDependency(pkg, 'webpack')) return 'other-webpack';
  return undefined;
}

function getExpectedPackage(framework: FrameworkId): string {
  return FRAMEWORKS.find((entry) => entry.id === framework)?.package ?? '';
}

function getConfigFiles(framework: FrameworkId): string[] {
  switch (framework) {
    case 'next':
      return ['next.config.ts', 'next.config.js', 'next.config.mjs'];
    case 'nuxt':
      return ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];
    case 'react-vite':
    case 'vue-vite':
    case 'other-vite':
      return ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
    case 'react-webpack':
    case 'vue-webpack':
    case 'other-webpack':
      return ['webpack.config.ts', 'webpack.config.js', 'webpack.config.mjs'];
  }
}

function hasPinFlowConfig(appPath: string, framework: FrameworkId): boolean {
  return getConfigFiles(framework).some((fileName) => {
    const configPath = path.join(appPath, fileName);
    if (!existsSync(configPath)) return false;

    try {
      const content = readFileSync(configPath, 'utf-8');
      return /@pinflow|withPinFlow|pinflow\(|PinFlowWebpackPlugin/.test(
        content,
      );
    } catch {
      return false;
    }
  });
}

export function getPinFlowSetupStatus(
  appPath: string,
  framework: FrameworkId,
): { status: PinFlowSetupStatus; missing: string[] } {
  const pkg = readPackageJson(appPath);
  const packageInstalled = hasDependency(pkg, getExpectedPackage(framework));
  const configInstalled = hasPinFlowConfig(appPath, framework);
  const missing: string[] = [];

  if (!packageInstalled) missing.push('package');
  if (!configInstalled) missing.push('config');

  if (missing.length === 0) return { status: 'configured', missing };
  if (missing.length === 2) return { status: 'not_configured', missing };
  return { status: 'partial', missing };
}

function listCandidateDirs(cwd: string): string[] {
  const dirs = new Set<string>([cwd]);
  const entries = readdirSync(cwd, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name)) continue;

    const firstLevel = path.join(cwd, entry.name);
    dirs.add(firstLevel);

    for (const child of readdirSync(firstLevel, { withFileTypes: true })) {
      if (!child.isDirectory() || IGNORED_DIRS.has(child.name)) continue;
      dirs.add(path.join(firstLevel, child.name));
    }
  }

  return Array.from(dirs).filter((dir) => {
    try {
      return statSync(dir).isDirectory();
    } catch {
      return false;
    }
  });
}

export function detectFrontendApps(cwd: string): FrontendAppCandidate[] {
  return listCandidateDirs(cwd)
    .map((absolutePath): FrontendAppCandidate | undefined => {
      const framework = detectFrameworkForApp(absolutePath);
      if (!framework) return undefined;

      const setup = getPinFlowSetupStatus(absolutePath, framework);
      return {
        appRoot: path.relative(cwd, absolutePath) || '.',
        absolutePath,
        framework,
        status: setup.status,
        missing: setup.missing,
        reason: detectFrameworkReason(framework),
      };
    })
    .filter((entry): entry is FrontendAppCandidate => entry !== undefined)
    .sort((a, b) => a.appRoot.localeCompare(b.appRoot));
}
