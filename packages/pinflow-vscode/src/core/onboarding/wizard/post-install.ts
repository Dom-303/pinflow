/**
 * Post-install agent-plugin flow — shows a 3-button toast (Run / Show command / Skip)
 * after a successful wizard write, letting the user install the chosen agent's
 * PinFlow plugin without leaving VS Code.
 * @module
 */
import path from 'node:path';

import * as vscode from 'vscode';

import type { AgentChoice } from './agent-step.js';

// ---------------------------------------------------------------------------
// Install command map (hardcoded, mirrored from relay's cli/init/types.ts AGENTS)
// ---------------------------------------------------------------------------

// NOTE: The codex marketplace command is known-broken upstream; it is still
// shipped so the user can see the real failure in their own terminal and fix
// it locally — gating the Run button would be worse UX.
const INSTALL_COMMANDS: Partial<Record<AgentChoice, readonly string[]>> = {
  codex: [
    'codex marketplace add Dom-303/pinflow',
    'codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
  ],
  'claude-code': [
    'claude plugin marketplace add Dom-303/pinflow',
    'claude plugin install pinflow@pinflow',
  ],
};

const AGENT_LABELS: Partial<Record<AgentChoice, string>> = {
  codex: 'Codex',
  'claude-code': 'Claude Code',
  copilot: 'GitHub Copilot',
  other: 'Other',
};

/** Returns the install commands for the given agent, or `undefined` if none. */
export function getInstallCommands(agent: AgentChoice): readonly string[] | undefined {
  return INSTALL_COMMANDS[agent];
}

// ---------------------------------------------------------------------------
// Public DI surface
// ---------------------------------------------------------------------------

/** External dependencies — the terminal helper is the primary injection point for tests. */
export interface RunPostInstallDeps {
  /** Opens a visible VS Code terminal at `cwd` and runs each command sequentially. */
  readonly runInstallInTerminal: (cwd: string, commands: readonly string[], agentLabel: string) => void;
  /** Internal — override `vscode.window.showInformationMessage` in tests. */
  readonly _showInformationMessage?: (message: string, ...actions: string[]) => Promise<string | undefined>;
  /** Internal — override `vscode.env.clipboard.writeText` in tests. */
  readonly _clipboardWriteText?: (text: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Default real implementations
// ---------------------------------------------------------------------------

function defaultRunInstallInTerminal(cwd: string, commands: readonly string[], agentLabel: string): void {
  const terminal = vscode.window.createTerminal({
    name: `PinFlow — Install ${agentLabel} plugin`,
    cwd,
  });
  terminal.show();
  for (const cmd of commands) {
    terminal.sendText(cmd);
  }
}

function defaultShowInformationMessage(message: string, ...actions: string[]): Promise<string | undefined> {
  return vscode.window.showInformationMessage(message, ...actions);
}

function defaultClipboardWriteText(text: string): Promise<void> {
  return vscode.env.clipboard.writeText(text);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Show the post-install toast and handle the user's choice.
 *
 * - Agents with known install commands (codex, claude-code): 3-button toast.
 * - Agents without (copilot, other): plain success toast only.
 */
export async function runPostInstall(
  agent: AgentChoice,
  cwd: string,
  deps?: RunPostInstallDeps,
): Promise<void> {
  const showMsg = deps?._showInformationMessage ?? defaultShowInformationMessage;
  const writeText = deps?._clipboardWriteText ?? defaultClipboardWriteText;
  const runInstall = deps?.runInstallInTerminal ?? defaultRunInstallInTerminal;

  const folderName = path.basename(cwd);
  const commands = getInstallCommands(agent);
  const agentLabel = AGENT_LABELS[agent] ?? agent;

  if (commands === undefined) {
    // No install commands available — plain success toast.
    await showMsg(`PinFlow ready in ${folderName}.`);
    return;
  }

  // Agents with install commands get the 3-button prompt.
  const action = await showMsg(
    `PinFlow ready in ${folderName}. Install ${agentLabel} plugin?`,
    'Run',
    'Show command',
    'Skip',
  );

  if (action === 'Run') {
    runInstall(cwd, commands, agentLabel);
    return;
  }

  if (action === 'Show command') {
    await writeText(commands.join('\n'));
    await showMsg(`${agentLabel} install command copied to clipboard.`);
    return;
  }

  // 'Skip' or dismissed (undefined) → silent no-op.
}
