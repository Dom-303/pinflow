import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface PinFlowCliInvocation {
  readonly command: string;
  readonly args: string[];
}

const MONOREPO_CLI_ENTRY = path.join(
  'packages',
  'pinflow-relay',
  'src',
  'cli',
  'bin',
  'main.ts',
);

export function getPinFlowCliInvocation(
  workspaceRoot: string,
  args: readonly string[],
  appRoot = workspaceRoot,
): PinFlowCliInvocation {
  if (isPinFlowMonorepo(workspaceRoot)) {
    return {
      command: 'corepack',
      args: [
        'pnpm',
        'exec',
        'tsx',
        MONOREPO_CLI_ENTRY,
        ...addAppRootArgs(workspaceRoot, args, appRoot),
      ],
    };
  }

  return {
    command: 'pinflow',
    args: [...args],
  };
}

export function formatPinFlowCliCommand(
  workspaceRoot: string,
  args: readonly string[],
  appRoot = workspaceRoot,
): string {
  const invocation = getPinFlowCliInvocation(workspaceRoot, args, appRoot);

  return [invocation.command, ...invocation.args].map(shellQuote).join(' ');
}

function addAppRootArgs(
  workspaceRoot: string,
  args: readonly string[],
  appRoot: string,
): string[] {
  if (path.resolve(workspaceRoot) === path.resolve(appRoot)) {
    return [...args];
  }

  const relativeAppRoot = path.relative(workspaceRoot, appRoot);
  const [command, ...rest] = args;

  if (command === 'follow') {
    return [command, ...rest, relativeAppRoot];
  }

  if (command === 'dev') {
    return [command, '--app-root', relativeAppRoot, ...rest];
  }

  return [...args];
}

function isPinFlowMonorepo(workspaceRoot: string): boolean {
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const cliEntryPath = path.join(workspaceRoot, MONOREPO_CLI_ENTRY);

  if (!existsSync(packageJsonPath) || !existsSync(cliEntryPath)) {
    return false;
  }

  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      name?: string;
    };

    return parsed.name === 'pinflow';
  } catch {
    return false;
  }
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}
