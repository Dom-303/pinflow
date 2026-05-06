import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';

export interface CliCheckResult {
  readonly available: boolean;
  readonly reason?: 'not-on-path' | 'not-executable' | 'unknown';
  readonly path?: string;
  readonly detail?: string;
}

/** Injected dependencies — defaults to real Node APIs. Test-overridable. */
export interface CliDetectionDeps {
  readonly runWhich: (command: string) => Promise<string>;
  readonly checkExecutable: (path: string) => Promise<void>;
}

const WHICH_COMMAND = process.platform === 'win32' ? 'where' : 'which';

function defaultRunWhich(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(WHICH_COMMAND, [command], (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

function defaultCheckExecutable(filePath: string): Promise<void> {
  return access(filePath, constants.X_OK);
}

const DEFAULT_DEPS: CliDetectionDeps = {
  runWhich: defaultRunWhich,
  checkExecutable: defaultCheckExecutable,
};

export async function detectPinFlowCli(
  deps: CliDetectionDeps = DEFAULT_DEPS,
): Promise<CliCheckResult> {
  try {
    const stdout = await deps.runWhich('pinflow');
    const resolvedPath = stdout.trim().split('\n')[0]?.trim();
    if (!resolvedPath) {
      return { available: false, reason: 'not-on-path' };
    }

    try {
      await deps.checkExecutable(resolvedPath);
    } catch {
      return { available: false, reason: 'not-executable', path: resolvedPath };
    }

    return { available: true, path: resolvedPath };
  } catch (error) {
    if (isExecError(error) && isNonZeroExit(error)) {
      return { available: false, reason: 'not-on-path' };
    }
    return {
      available: false,
      reason: 'unknown',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function isExecError(value: unknown): value is { code?: number | string } {
  return typeof value === 'object' && value !== null;
}

function isNonZeroExit(error: { code?: number | string }): boolean {
  return typeof error.code === 'number' && error.code !== 0;
}
