/**
 * Agent CLI detection — checks which agent binaries are available on PATH.
 * Pure module: no vscode imports.
 * @module
 */
import { execFile } from 'node:child_process';

export interface InstalledAgents {
  readonly codex: boolean;
  readonly 'claude-code': boolean;
  readonly copilot: boolean;
}

/** Injected dependencies — defaults to real Node APIs. Test-overridable. */
export interface AgentDetectionDeps {
  readonly execFileFn?: (cmd: string, args: string[]) => Promise<{ stdout: string }>;
}

const WHICH_COMMAND = process.platform === 'win32' ? 'where' : 'which';

function defaultExecFileFn(cmd: string, args: string[]): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout });
      }
    });
  });
}

async function checkBinary(
  binary: string,
  execFileFn: (cmd: string, args: string[]) => Promise<{ stdout: string }>,
): Promise<boolean> {
  try {
    const { stdout } = await execFileFn(WHICH_COMMAND, [binary]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function detectInstalledAgents(deps?: AgentDetectionDeps): Promise<InstalledAgents> {
  const execFileFn = deps?.execFileFn ?? defaultExecFileFn;

  const [codex, claudeCode, copilot] = await Promise.all([
    checkBinary('codex', execFileFn),
    checkBinary('claude', execFileFn),
    checkBinary('copilot', execFileFn),
  ]);

  return {
    codex,
    'claude-code': claudeCode,
    copilot,
  };
}
