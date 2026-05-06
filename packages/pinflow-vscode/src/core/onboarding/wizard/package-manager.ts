/**
 * Package manager detection from lockfiles.
 * @module
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

export type PackageManagerId = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface PackageManagerConfig {
  readonly id: PackageManagerId;
  readonly label: string;
  readonly installCmd: string;
}

export const PACKAGE_MANAGERS: readonly PackageManagerConfig[] = [
  { id: 'npm', label: 'npm', installCmd: 'npm install -D' },
  { id: 'pnpm', label: 'pnpm', installCmd: 'pnpm add -D' },
  { id: 'yarn', label: 'yarn', installCmd: 'yarn add -D' },
  { id: 'bun', label: 'bun', installCmd: 'bun add -D' },
] as const;

export interface PackageManagerDeps {
  readonly fileExists: (p: string) => boolean;
}

const DEFAULT_DEPS: PackageManagerDeps = {
  fileExists: (p) => existsSync(p),
};

export function detectPackageManager(
  workspaceRoot: string,
  deps: PackageManagerDeps = DEFAULT_DEPS,
): PackageManagerConfig {
  if (deps.fileExists(path.join(workspaceRoot, 'pnpm-lock.yaml'))) {
    return PACKAGE_MANAGERS.find((p) => p.id === 'pnpm')!;
  }
  if (deps.fileExists(path.join(workspaceRoot, 'yarn.lock'))) {
    return PACKAGE_MANAGERS.find((p) => p.id === 'yarn')!;
  }
  if (
    deps.fileExists(path.join(workspaceRoot, 'bun.lock')) ||
    deps.fileExists(path.join(workspaceRoot, 'bun.lockb'))
  ) {
    return PACKAGE_MANAGERS.find((p) => p.id === 'bun')!;
  }
  return PACKAGE_MANAGERS.find((p) => p.id === 'npm')!;
}
