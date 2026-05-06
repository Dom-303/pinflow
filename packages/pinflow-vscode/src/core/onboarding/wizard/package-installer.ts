/**
 * Spawn-based package installer with idempotency guard.
 * @module
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { PackageManagerConfig } from './package-manager.js';

export type InstallStatus = 'installed' | 'already-present' | 'failed';

export interface PackageInstallerDeps {
  /** Argv-based command runner. NEVER pass shell strings — only split argv arrays. */
  readonly runCommand: (
    bin: string,
    args: readonly string[],
    options: { cwd: string; onOutput: (line: string) => void },
  ) => Promise<{ exitCode: number }>;
  readonly readJson: (p: string) => Promise<Record<string, unknown> | undefined>;
}

function defaultRunCommand(
  bin: string,
  args: readonly string[],
  options: { cwd: string; onOutput: (line: string) => void },
): Promise<{ exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(bin, [...args], { cwd: options.cwd });

    let buffer = '';

    function flushLines(chunk: string): void {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        options.onOutput(line);
      }
    }

    child.stdout.on('data', (data: Buffer) => flushLines(data.toString()));
    child.stderr.on('data', (data: Buffer) => flushLines(data.toString()));

    child.on('close', (code) => {
      if (buffer.length > 0) options.onOutput(buffer);
      resolve({ exitCode: code ?? 0 });
    });
  });
}

async function defaultReadJson(p: string): Promise<Record<string, unknown> | undefined> {
  try {
    const text = await readFile(p, 'utf8');
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

const DEFAULT_DEPS: PackageInstallerDeps = {
  runCommand: defaultRunCommand,
  readJson: defaultReadJson,
};

export async function installPackage(
  appPath: string,
  packageName: string,
  pm: PackageManagerConfig,
  onOutput: (line: string) => void,
  deps: PackageInstallerDeps = DEFAULT_DEPS,
): Promise<{ status: InstallStatus; stderr?: string }> {
  const pkgJsonPath = path.join(appPath, 'package.json');
  const pkgJson = await deps.readJson(pkgJsonPath);

  if (pkgJson !== undefined) {
    const dependencies = pkgJson['dependencies'] as Record<string, unknown> | undefined;
    const devDependencies = pkgJson['devDependencies'] as Record<string, unknown> | undefined;

    if (dependencies?.[packageName] !== undefined || devDependencies?.[packageName] !== undefined) {
      return { status: 'already-present' };
    }
  }

  const [bin, ...prefix] = pm.installCmd.split(/\s+/);
  const argv = [...prefix, packageName];

  onOutput(`$ ${bin} ${argv.join(' ')}`);

  const { exitCode } = await deps.runCommand(bin, argv, { cwd: appPath, onOutput });

  if (exitCode !== 0) {
    return { status: 'failed', stderr: `Exit code ${exitCode}` };
  }

  return { status: 'installed' };
}
