/**
 * Wizard step 1 — Agent selection QuickPick.
 * @module
 */
import * as vscode from 'vscode';

import type { InstalledAgents } from './agent-detection.js';

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
  readonly installedAgents?: InstalledAgents;
  readonly stepLabel?: string;
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

function buildOrderedItems(installedAgents?: InstalledAgents): readonly AgentQuickPickItem[] {
  if (!installedAgents) {
    return AGENT_ITEMS;
  }

  const installed: AgentQuickPickItem[] = [];
  const rest: AgentQuickPickItem[] = [];

  for (const item of AGENT_ITEMS) {
    const isInstalled = installedAgents[item.value as keyof InstalledAgents] === true;
    if (isInstalled) {
      installed.push({ ...item, description: '✓ installed' });
    } else {
      rest.push(item);
    }
  }

  return [...installed, ...rest];
}

/**
 * Show the agent-selection QuickPick and return the chosen agent ID, or
 * `undefined` if the user cancelled (Esc).
 *
 * Pass `installedAgents` via `deps` to surface detection badges and reorder
 * installed agents to the top of the list.
 */
export async function pickAgent(deps: AgentStepDeps = DEFAULT_DEPS): Promise<AgentChoice | undefined> {
  const items = buildOrderedItems(deps.installedAgents);
  const titlePrefix = deps.stepLabel ? `${deps.stepLabel} — ` : '';

  const picked = await deps.showQuickPick(items, {
    title: `PinFlow Setup · ${titlePrefix}Choose agent`,
    placeHolder: 'Choose the coding agent for this project',
  });

  return picked?.value;
}
