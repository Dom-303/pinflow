import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const PINFLOW_DIR = '.pinflow';
const RELAY_LOCK_FILE = 'relay.lock';
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
  readonly message: string;
}

export interface PinFlowWorkspaceOptions {
  readonly processProbe?: ProcessProbe;
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
    message: 'PinFlow ready',
  };
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

    if (hasPinFlowPackage(dir)) {
      return {
        workspaceRoot: dir,
        appRoot: dir,
      };
    }
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
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
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

function defaultProcessProbe(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
