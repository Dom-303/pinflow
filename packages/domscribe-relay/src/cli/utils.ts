/**
 * CLI utility functions
 * @module @domscribe/relay/cli/utils
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { PATHS } from '@domscribe/core';

import { findConfigFile, loadAppRoot } from './config-loader.js';

/**
 * Locate the workspace root (the directory containing PinFlow workspace artifacts).
 *
 * @remarks
 * Discovery chain:
 * 1. `.pinflow/` or legacy `.domscribe/` at cwd — single-repo fast path
 * 2. `pinflow.config.*` or legacy `domscribe.config.*` at cwd — monorepo
 * 3. Walk up for workspace artifact dirs — nested working directory
 * 4. Walk up for config files — nested working directory in monorepo
 * 5. Nothing found — returns `undefined` (dormant mode)
 */
export function getWorkspaceRoot(): string | undefined {
  const cwd = process.cwd();

  // 1. Primary or legacy workspace dir at cwd (single-repo fast path)
  if (hasWorkspaceArtifacts(cwd)) {
    return cwd;
  }

  // 2. Config file at cwd (monorepo: config at repo root)
  const configAtCwd = findConfigFile(cwd);
  if (configAtCwd) {
    return loadAppRoot(configAtCwd);
  }

  // 3. Walk up for workspace artifact dir
  const fromWorkspace = walkUpToFindWorkspaceArtifacts(cwd);
  if (fromWorkspace) return fromWorkspace;

  // 4. Walk up for config file
  return walkUpToFindConfig(cwd);
}

function hasWorkspaceArtifacts(dir: string): boolean {
  return (
    existsSync(path.join(dir, PATHS.DOMSCRIBE_DIR)) ||
    existsSync(path.join(dir, PATHS.LEGACY_DOMSCRIBE_DIR))
  );
}

function walkUpToFindWorkspaceArtifacts(startPath: string): string | undefined {
  let dir = path.resolve(startPath);

  // Handle if startPath is a file
  if (!statSync(dir).isDirectory()) {
    dir = path.dirname(dir);
  }

  while (true) {
    if (hasWorkspaceArtifacts(dir)) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
}

function walkUpToFindConfig(startPath: string): string | undefined {
  let dir = path.resolve(startPath);

  if (!statSync(dir).isDirectory()) {
    dir = path.dirname(dir);
  }

  while (true) {
    const configPath = findConfigFile(dir);
    if (configPath) {
      return loadAppRoot(configPath);
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
}
