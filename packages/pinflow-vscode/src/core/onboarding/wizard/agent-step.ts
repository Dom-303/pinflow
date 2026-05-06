/**
 * Wizard step 1 — Agent selection QuickPick.
 * @module
 */
import * as vscode from 'vscode';

export type AgentChoice = 'codex' | 'claude-code' | 'copilot' | 'other';

interface AgentQuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly value: AgentChoice;
}

/** Minimal VS Code window surface — test-overridable via DI. */
export interface AgentStepDeps {
  readonly showQuickPick: (
    items: readonly AgentQuickPickItem[],
    options?: { title?: string; placeHolder?: string },
  ) => Promise<AgentQuickPickItem | undefined>;
}

const AGENT_ITEMS: readonly AgentQuickPickItem[] = [
  { label: 'Codex', description: 'recommended', value: 'codex' },
  { label: 'Claude Code', value: 'claude-code' },
  { label: 'GitHub Copilot', value: 'copilot' },
  { label: 'Other', description: 'manual setup', value: 'other' },
];

const DEFAULT_DEPS: AgentStepDeps = {
  showQuickPick: (items, options) =>
    vscode.window.showQuickPick([...items], options) as Promise<AgentQuickPickItem | undefined>,
};

/**
 * Show the agent-selection QuickPick and return the chosen agent ID, or
 * `undefined` if the user cancelled (Esc).
 */
export async function pickAgent(deps: AgentStepDeps = DEFAULT_DEPS): Promise<AgentChoice | undefined> {
  const picked = await deps.showQuickPick(AGENT_ITEMS, {
    title: 'Choose coding agent',
    placeHolder: 'Select the AI coding agent you use with this project',
  });

  return picked?.value;
}
