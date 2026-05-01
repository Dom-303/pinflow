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
): PinFlowCliInvocation {
  if (isPinFlowMonorepo(workspaceRoot)) {
    return {
      command: 'corepack',
      args: ['pnpm', 'exec', 'tsx', MONOREPO_CLI_ENTRY, ...args],
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
): string {
  const invocation = getPinFlowCliInvocation(workspaceRoot, args);

  return [invocation.command, ...invocation.args].map(shellQuote).join(' ');
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
