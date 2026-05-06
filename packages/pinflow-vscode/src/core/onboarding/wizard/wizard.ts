/**
 * Wizard orchestrator — ties agent/app-root/framework steps together,
 * writes config, triggers the success callback, and shows toasts.
 * No spawn, no terminal, no CLI dependency. Pure VS Code API.
 * @module
 */
import path from 'node:path';

import * as vscode from 'vscode';

import { detectApps } from './app-detection.js';
import { detectInstalledAgents } from './agent-detection.js';
import { pickAgent } from './agent-step.js';
import { pickAppRoot } from './monorepo-step.js';
import { pickFramework } from './framework-step.js';
import { writeWizardConfig } from './config-writer.js';
import { runPostInstall } from './post-install.js';
import type { DetectedApp } from './app-detection.js';
import type { InstalledAgents } from './agent-detection.js';
import type { AgentChoice } from './agent-step.js';
import type { FrameworkChoice } from './framework-step.js';
import type { WriteConfigInput } from './config-writer.js';
import type { RunPostInstallDeps } from './post-install.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RunWizardDeps {
  /** Called immediately after a successful config write, before success toast. */
  readonly onSuccess: () => Promise<void> | void;
  /** Opens a terminal for manual `pinflow init`; used as error-recovery action. */
  readonly runInitInTerminal: (cwd: string) => void;
}

// ---------------------------------------------------------------------------
// Internal DI (test-overridable vscode + step surface)
// ---------------------------------------------------------------------------

/** Internal dependencies — injected for testing, defaults to real vscode bindings. */
export interface WizardInternalDeps {
  readonly detectApps: (cwd: string) => DetectedApp[];
  readonly detectInstalledAgents: () => Promise<InstalledAgents>;
  readonly pickAgent: (installedAgents: InstalledAgents) => Promise<AgentChoice | undefined>;
  readonly pickAppRoot: (cwd: string, apps: readonly DetectedApp[]) => Promise<string | undefined>;
  readonly pickFramework: (detectedApp: DetectedApp) => Promise<FrameworkChoice | undefined>;
  readonly writeWizardConfig: (input: WriteConfigInput) => Promise<void>;
  readonly runPostInstall: (agent: AgentChoice, cwd: string, postInstallDeps: RunPostInstallDeps) => Promise<void>;
  readonly showErrorMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly createTerminal: (options: { name: string; cwd: string }) => { sendText: (text: string) => void; show: () => void };
}

const DEFAULT_INTERNAL_DEPS: WizardInternalDeps = {
  detectApps: (cwd) => detectApps(cwd),
  detectInstalledAgents: () => detectInstalledAgents(),
  pickAgent: (installedAgents) =>
    pickAgent({
      installedAgents,
      showQuickPick: (items, options) =>
        vscode.window.showQuickPick([...items], options) as Promise<(typeof items)[number] | undefined>,
    }),
  pickAppRoot: (cwd, apps) => pickAppRoot(cwd, apps),
  pickFramework: (detectedApp) => pickFramework(detectedApp),
  writeWizardConfig: (input) => writeWizardConfig(input),
  runPostInstall: (agent, cwd, postInstallDeps) => runPostInstall(agent, cwd, postInstallDeps),
  showErrorMessage: (message, ...actions) =>
    vscode.window.showErrorMessage(message, ...actions),
  createTerminal: (options) => vscode.window.createTerminal(options),
};

// ---------------------------------------------------------------------------
// Module-level concurrency lock (per-folder)
// ---------------------------------------------------------------------------

const pendingWizards = new Set<string>();

/** Test-only helper — clears the pending-wizards lock between tests. */
export const __test_resetPendingWizards = (): void => {
  pendingWizards.clear();
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function runWizard(
  cwd: string,
  deps: RunWizardDeps,
  internalDeps: WizardInternalDeps = DEFAULT_INTERNAL_DEPS,
): Promise<void> {
  if (pendingWizards.has(cwd)) return;
  pendingWizards.add(cwd);

  try {
    await runWizardSteps(cwd, deps, internalDeps);
  } finally {
    pendingWizards.delete(cwd);
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function runWizardSteps(
  cwd: string,
  deps: RunWizardDeps,
  internal: WizardInternalDeps,
): Promise<void> {
  // Step 1 — detect apps + installed agents in parallel (both pure and fast)
  const [apps, installedAgents] = await Promise.all([
    Promise.resolve(internal.detectApps(cwd)),
    internal.detectInstalledAgents(),
  ]);

  // Step 2 — agent selection (with installed-agent badges)
  const agent = await internal.pickAgent(installedAgents);
  if (agent === undefined) return;

  // Step 3 — app-root selection
  const appRoot = await internal.pickAppRoot(cwd, apps);
  if (appRoot === undefined) return;

  // Step 4 — framework selection (pass detected app for the chosen root, or empty placeholder)
  const detectedApp: DetectedApp = apps.find((a) => a.path === appRoot) ?? { path: appRoot };
  const framework = await internal.pickFramework(detectedApp);
  if (framework === undefined) return;

  // Step 5 — write config (all-or-nothing)
  try {
    await internal.writeWizardConfig({ cwd, agent, framework, appRoot });
  } catch (err: unknown) {
    await showFailureToast(cwd, err, deps.runInitInTerminal, internal);
    return;
  }

  // Step 6 — notify caller, then run post-install flow
  await deps.onSuccess();

  const postInstallDeps: RunPostInstallDeps = {
    runInstallInTerminal: (terminalCwd, commands, agentLabel) => {
      const terminal = internal.createTerminal({
        name: `PinFlow — Install ${agentLabel} plugin`,
        cwd: terminalCwd,
      });
      for (const cmd of commands) {
        terminal.sendText(cmd);
      }
      terminal.show();
    },
  };

  await internal.runPostInstall(agent, cwd, postInstallDeps);
}

async function showFailureToast(
  cwd: string,
  err: unknown,
  runInitInTerminal: (cwd: string) => void,
  internal: WizardInternalDeps,
): Promise<void> {
  const folderName = path.basename(cwd);
  const message =
    err instanceof Error
      ? `PinFlow setup failed for ${folderName}: ${err.message}`
      : `PinFlow setup failed for ${folderName}.`;

  const action = await internal.showErrorMessage(message, 'Open Terminal');
  if (action === 'Open Terminal') runInitInTerminal(cwd);
}
