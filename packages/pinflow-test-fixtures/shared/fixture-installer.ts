/**
 * Fixture Installer
 *
 * Installs a single fixture's PinFlow dependencies from the local
 * Verdaccio registry. Called by scripts/install-fixture.ts with a
 * FIXTURE_ID env var — orchestration across fixtures is handled by Nx.
 *
 * Staleness is tracked via a PinFlow-specific stamp file.
 * A fixture is reinstalled only when its stamp doesn't match the
 * current workspace identity.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  buildInstallStampValue,
  getInstallStampFilename,
  readWorkspaceIdentity,
} from './workspace-identity.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options accepted by {@link installFixture}. */
export interface InstallOptions {
  /** Absolute path to the monorepo root (contains root package.json). */
  workspaceRoot: string;

  /** Full Verdaccio registry URL, e.g. `http://localhost:4873`. */
  registryUrl: string;

  /** Verdaccio port (used in the .npmrc auth token line). */
  registryPort: number;

  /** Optional log function. Defaults to `console.log`. */
  log?: (message: string) => void;

  /** Force a reinstall even when the freshness stamp matches. */
  force?: boolean;
}

/** Per-fixture outcome. */
export interface FixtureOutcome {
  /** Whether the fixture was reinstalled or skipped. */
  action: 'installed' | 'skipped' | 'failed';
  /** Error message when action is 'failed'. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAMP_FILENAME = getInstallStampFilename();
const PINFLOW_SCOPE = '@pinflow';
const LEGACY_SCOPE = '@pinflow';

// ---------------------------------------------------------------------------
// Version & Staleness
// ---------------------------------------------------------------------------

/** Read the stamp file in a fixture directory. Returns `undefined` if absent. */
function readStamp(fixturePath: string): string | undefined {
  const stampPath = join(fixturePath, STAMP_FILENAME);
  if (!existsSync(stampPath)) return undefined;
  try {
    return readFileSync(stampPath, 'utf-8').trim();
  } catch {
    return undefined;
  }
}

/** Write the stamp file after a successful install. */
function writeStamp(fixturePath: string, stampValue: string): void {
  writeFileSync(join(fixturePath, STAMP_FILENAME), stampValue);
}

/** True when the fixture's stamp matches the target workspace identity. */
function isCurrent(fixturePath: string, stampValue: string): boolean {
  return readStamp(fixturePath) === stampValue;
}

// ---------------------------------------------------------------------------
// Registry Configuration
// ---------------------------------------------------------------------------

/**
 * Read the auth token from the root .npmrc file.
 * Falls back to an empty string if no token is found (Verdaccio with
 * `access: $all` doesn't require auth, but npm may expect the line).
 */
function readAuthToken(workspaceRoot: string, registryPort: number): string {
  const npmrcPath = join(workspaceRoot, '.npmrc');
  if (!existsSync(npmrcPath)) return '';
  const content = readFileSync(npmrcPath, 'utf-8');
  const pattern = new RegExp(
    `//localhost:${registryPort}/:_authToken="([^"]*)"`,
  );
  const match = content.match(pattern);
  return match ? match[1] : '';
}

/** Build the .npmrc content for a fixture. */
function buildNpmrc(
  registryUrl: string,
  registryPort: number,
  authToken: string,
): string {
  const lines = [
    `${PINFLOW_SCOPE}:registry=${registryUrl}/`,
    `${LEGACY_SCOPE}:registry=${registryUrl}/`,
    'registry=https://registry.npmjs.org/',
  ];
  if (authToken) {
    lines.push(`//localhost:${registryPort}/:_authToken="${authToken}"`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Ensure the fixture has a .npmrc pointing at the local registry.
 * Only writes when the file is missing or doesn't contain the expected line.
 */
function ensureNpmrc(
  fixturePath: string,
  registryUrl: string,
  registryPort: number,
  authToken: string,
): boolean {
  const npmrcPath = join(fixturePath, '.npmrc');
  const marker = `${PINFLOW_SCOPE}:registry=${registryUrl}`;

  const existing = existsSync(npmrcPath)
    ? readFileSync(npmrcPath, 'utf-8')
    : '';

  if (existing.includes(marker)) return false;

  writeFileSync(npmrcPath, buildNpmrc(registryUrl, registryPort, authToken));
  return true;
}

// ---------------------------------------------------------------------------
// Pre-install Cleanup
// ---------------------------------------------------------------------------

/**
 * Remove artifacts that prevent npm from resolving the latest packages:
 *
 * 1. **package-lock.json** — locks exact versions; npm install is a no-op
 *    even when Verdaccio has newer packages.
 * 2. **node_modules/@pinflow** and **node_modules/@pinflow** — force a
 *    fresh fetch of the canonical and legacy scopes rather than reusing
 *    cached copies.
 * 3. **node_modules/.vite** — Vite prebundles workspace packages into
 *    optimized deps. When PinFlow package internals change without a
 *    package version bump, that cache can keep serving stale overlay code.
 */
function purgeStaleArtifacts(fixturePath: string): void {
  const lockPath = join(fixturePath, 'package-lock.json');
  if (existsSync(lockPath)) {
    rmSync(lockPath);
  }

  for (const scope of [PINFLOW_SCOPE, LEGACY_SCOPE]) {
    const scopeDir = join(fixturePath, 'node_modules', scope);
    if (existsSync(scopeDir)) {
      rmSync(scopeDir, { recursive: true });
    }
  }

  const viteCacheDir = join(fixturePath, 'node_modules', '.vite');
  if (existsSync(viteCacheDir)) {
    rmSync(viteCacheDir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

/**
 * Run `npm install` in a single fixture directory.
 *
 * Flags:
 *   --no-package-lock  Don't create/update a lockfile (fixtures use "*" ranges)
 *   --no-audit         Skip vulnerability audit (irrelevant for local packages)
 *   --no-fund          Suppress funding messages
 */
function runNpmInstall(fixturePath: string): void {
  execSync('npm install --no-package-lock --no-audit --no-fund', {
    cwd: fixturePath,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Install a single fixture's PinFlow packages from the local registry.
 *
 * 1. Ensure .npmrc points at the local Verdaccio registry
 * 2. Skip if the stamp file matches the current workspace identity
 * 3. Purge the lockfile and PinFlow scopes from node_modules
 * 4. Run npm install
 * 5. Write the stamp file on success
 */
export function installFixture(
  fixtureDir: string,
  options: InstallOptions,
): FixtureOutcome {
  const {
    workspaceRoot,
    registryUrl,
    registryPort,
    log = console.log,
    force = false,
  } = options;

  const identity = readWorkspaceIdentity(workspaceRoot);
  const stampValue = buildInstallStampValue(identity);

  const authToken = readAuthToken(workspaceRoot, registryPort);
  ensureNpmrc(fixtureDir, registryUrl, registryPort, authToken);

  if (!force && isCurrent(fixtureDir, stampValue)) {
    log(`Skipped (${stampValue} already installed)`);
    return { action: 'skipped' };
  }

  log(`Installing (${stampValue})...`);

  try {
    purgeStaleArtifacts(fixtureDir);
    runNpmInstall(fixtureDir);
    writeStamp(fixtureDir, stampValue);
    return { action: 'installed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`WARN: install failed: ${message.slice(0, 200)}`);
    return { action: 'failed', error: message };
  }
}
