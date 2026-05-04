import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const PINFLOW_DIR = '.pinflow';
const RELAY_LOCK_FILE = 'relay.lock';
const DEV_LOCK_FILE = 'dev.lock';
const CONFIG_FILENAMES = [
  'pinflow.config.json',
  'pinflow.config.js',
  'pinflow.config.ts',
] as const;
const PINFLOW_PACKAGE_NAMES = new Set([
  'pinflow',
  '@pinflow/react',
  '@pinflow/vue',
  '@pinflow/next',
  '@pinflow/nuxt',
  '@pinflow/transform',
]);
const PINFLOW_MONOREPO_DEMO_APP_ROOT = path.join(
  'packages',
  'pinflow-test-fixtures',
  'fixtures',
  'vite',
  'v5',
  'react-18-ts',
);
const MAX_WORKSPACE_CANDIDATE_DEPTH = 2;
const IGNORED_WORKSPACE_CANDIDATE_DIRS = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'test-output',
]);

export type PinFlowWorkspaceStatus =
  | 'ready'
  | 'relay-missing'
  | 'not-configured';

export type ProcessProbe = (pid: number) => boolean;

export interface PinFlowWorkspaceResult {
  readonly status: PinFlowWorkspaceStatus;
  readonly workspaceFolder: string;
  readonly workspaceRoot?: string;
  readonly appRoot?: string;
  readonly configPath?: string;
  readonly relay?: {
    readonly host: string;
    readonly port: number;
    readonly pid: number;
  };
  readonly devServer?: {
    readonly host: string;
    readonly port: number;
    readonly url: string;
    readonly pid: number;
  };
  readonly message: string;
}

export interface PinFlowWorkspaceOptions {
  readonly processProbe?: ProcessProbe;
  readonly preferredFolder?: string;
}

interface RelayLockFile {
  readonly pid?: unknown;
  readonly host?: unknown;
  readonly port?: unknown;
}

export function getPinFlowWorkspaceStatus(
  workspaceFolder: string,
  options: PinFlowWorkspaceOptions = {},
): PinFlowWorkspaceResult {
  const resolvedFolder = path.resolve(workspaceFolder);
  const configured = findConfiguredWorkspace(resolvedFolder);

  if (!configured) {
    return {
      status: 'not-configured',
      workspaceFolder: resolvedFolder,
      message: 'PinFlow app not configured',
    };
  }

  const relay = readRunningRelay(configured.workspaceRoot, options.processProbe);

  if (!relay) {
    return {
      status: 'relay-missing',
      workspaceFolder: resolvedFolder,
      workspaceRoot: configured.workspaceRoot,
      appRoot: configured.appRoot,
      configPath: configured.configPath,
      devServer: readRunningDevServer(configured.workspaceRoot, options.processProbe),
      message: 'PinFlow relay is not running',
    };
  }

  return {
    status: 'ready',
    workspaceFolder: resolvedFolder,
    workspaceRoot: configured.workspaceRoot,
    appRoot: configured.appRoot,
    configPath: configured.configPath,
    relay,
    devServer: readRunningDevServer(configured.workspaceRoot, options.processProbe),
    message: 'PinFlow ready',
  };
}

export function getBestPinFlowWorkspaceStatus(
  workspaceFolders: readonly string[],
  options: PinFlowWorkspaceOptions = {},
): PinFlowWorkspaceResult | undefined {
  const candidateFolders = workspaceFolders.flatMap((workspaceFolder) =>
    getWorkspaceCandidateFolders(workspaceFolder),
  );
  const statuses = candidateFolders.map((workspaceFolder) =>
    getPinFlowWorkspaceStatus(workspaceFolder, options),
  );

  const preferred = resolvePreferredStatus(
    statuses,
    workspaceFolders,
    options.preferredFolder,
  );
  if (preferred) return preferred;

  return (
    statuses.find((status) => status.status === 'ready') ??
    statuses.find((status) => status.status === 'relay-missing') ??
    statuses[0]
  );
}

function resolvePreferredStatus(
  statuses: readonly PinFlowWorkspaceResult[],
  workspaceFolders: readonly string[],
  preferredFolder: string | undefined,
): PinFlowWorkspaceResult | undefined {
  if (!preferredFolder) return;

  const candidates = path.isAbsolute(preferredFolder)
    ? [path.resolve(preferredFolder)]
    : workspaceFolders.map((folder) =>
        path.resolve(folder, preferredFolder),
      );

  for (const candidate of candidates) {
    const match = statuses.find(
      (status) => status.workspaceRoot === candidate,
    );
    if (match && match.status !== 'not-configured') return match;
  }

  return;
}

function getWorkspaceCandidateFolders(workspaceFolder: string): string[] {
  const resolvedFolder = path.resolve(workspaceFolder);
  const candidates: string[] = [];

  collectWorkspaceCandidateFolders(
    resolvedFolder,
    candidates,
    MAX_WORKSPACE_CANDIDATE_DEPTH,
  );

  return candidates;
}

function collectWorkspaceCandidateFolders(
  folder: string,
  candidates: string[],
  remainingDepth: number,
): void {
  candidates.push(folder);

  if (remainingDepth <= 0) return;

  try {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (IGNORED_WORKSPACE_CANDIDATE_DIRS.has(entry.name)) continue;

      collectWorkspaceCandidateFolders(
        path.join(folder, entry.name),
        candidates,
        remainingDepth - 1,
      );
    }
  } catch {
    // If the folder cannot be read, keep the direct workspace check.
  }
}

function findConfiguredWorkspace(
  startPath: string,
):
  | {
      workspaceRoot: string;
      appRoot: string;
      configPath?: string;
    }
  | undefined {
  for (const dir of walkUp(startPath)) {
    if (hasPinFlowArtifacts(dir)) {
      return {
        workspaceRoot: dir,
        appRoot: dir,
      };
    }

    const configPath = findConfigFile(dir);
    if (configPath) {
      const appRoot = loadConfiguredAppRoot(configPath);

      return {
        workspaceRoot: appRoot,
        appRoot,
        configPath,
      };
    }

    const monorepoDemoAppRoot = getPinFlowMonorepoDemoAppRoot(dir);
    if (monorepoDemoAppRoot) {
      return {
        workspaceRoot: monorepoDemoAppRoot,
        appRoot: monorepoDemoAppRoot,
      };
    }

    if (hasPinFlowPackage(dir)) {
      return {
        workspaceRoot: dir,
        appRoot: dir,
      };
    }
  }

  return;
}

function getPinFlowMonorepoDemoAppRoot(dir: string): string | undefined {
  if (!hasPackageName(dir, 'pinflow')) {
    return;
  }

  const demoAppRoot = path.join(dir, PINFLOW_MONOREPO_DEMO_APP_ROOT);

  if (hasPinFlowArtifacts(demoAppRoot)) {
    return demoAppRoot;
  }

  return;
}

function* walkUp(startPath: string): Generator<string> {
  let current = path.resolve(startPath);

  if (existsSync(current) && !statSync(current).isDirectory()) {
    current = path.dirname(current);
  }

  while (true) {
    yield current;

    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function hasPinFlowArtifacts(dir: string): boolean {
  return existsSync(path.join(dir, PINFLOW_DIR));
}

function findConfigFile(dir: string): string | undefined {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(dir, filename);

    if (existsSync(configPath)) {
      return configPath;
    }
  }

  return;
}

function loadConfiguredAppRoot(configPath: string): string {
  if (!configPath.endsWith('.json')) {
    return path.dirname(configPath);
  }

  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as { appRoot?: unknown };
  const appRoot = typeof parsed.appRoot === 'string' ? parsed.appRoot : '.';

  return path.resolve(path.dirname(configPath), appRoot);
}

function hasPinFlowPackage(dir: string): boolean {
  const packageJsonPath = path.join(dir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    if (parsed.name && PINFLOW_PACKAGE_NAMES.has(parsed.name)) {
      return true;
    }

    const dependencies = {
      ...parsed.dependencies,
      ...parsed.devDependencies,
    };

    return Object.keys(dependencies).some((name) =>
      PINFLOW_PACKAGE_NAMES.has(name),
    );
  } catch {
    return false;
  }
}

function hasPackageName(dir: string, expectedName: string): boolean {
  const packageJsonPath = path.join(dir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      name?: string;
    };

    return parsed.name === expectedName;
  } catch {
    return false;
  }
}

function readRunningRelay(
  workspaceRoot: string,
  processProbe: ProcessProbe = defaultProcessProbe,
): PinFlowWorkspaceResult['relay'] | undefined {
  const lockPath = path.join(workspaceRoot, PINFLOW_DIR, RELAY_LOCK_FILE);

  if (!existsSync(lockPath)) {
    return;
  }

  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf-8')) as RelayLockFile;
    const pid = typeof lock.pid === 'number' ? lock.pid : undefined;
    const host = typeof lock.host === 'string' ? lock.host : undefined;
    const port = typeof lock.port === 'number' ? lock.port : undefined;

    if (!pid || !host || !port || !processProbe(pid)) {
      return;
    }

    return { host, port, pid };
  } catch {
    return;
  }
}

function readRunningDevServer(
  workspaceRoot: string,
  processProbe: ProcessProbe = defaultProcessProbe,
): PinFlowWorkspaceResult['devServer'] | undefined {
  const lockPath = path.join(workspaceRoot, PINFLOW_DIR, DEV_LOCK_FILE);

  if (!existsSync(lockPath)) {
    return;
  }

  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf-8')) as {
      host?: unknown;
      port?: unknown;
      url?: unknown;
      pid?: unknown;
    };
    const host = typeof lock.host === 'string' ? lock.host : undefined;
    const port = typeof lock.port === 'number' ? lock.port : undefined;
    const url = typeof lock.url === 'string' ? lock.url : undefined;
    const pid = typeof lock.pid === 'number' ? lock.pid : undefined;

    if (!host || !port || !url || !pid || !processProbe(pid)) {
      return;
    }

    return { host, port, url, pid };
  } catch {
    return;
  }
}

function defaultProcessProbe(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
