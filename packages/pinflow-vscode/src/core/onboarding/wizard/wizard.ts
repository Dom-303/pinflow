/**
 * Wizard orchestrator — ties agent/app-root/framework steps together,
 * writes config, triggers the success callback, and shows toasts.
 * No spawn, no terminal, no CLI dependency. Pure VS Code API.
 * @module
 */
import path from 'node:path';

import * as vscode from 'vscode';

import { detectApps } from './app-detection.js';
import { pickAgent } from './agent-step.js';
import { pickAppRoot } from './monorepo-step.js';
import { pickFramework } from './framework-step.js';
import { writeWizardConfig } from './config-writer.js';
import type { DetectedApp } from './app-detection.js';
import type { AgentChoice } from './agent-step.js';
import type { FrameworkChoice } from './framework-step.js';
import type { WriteConfigInput } from './config-writer.js';

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
  readonly pickAgent: () => Promise<AgentChoice | undefined>;
  readonly pickAppRoot: (cwd: string, apps: readonly DetectedApp[]) => Promise<string | undefined>;
  readonly pickFramework: (detectedApp: DetectedApp) => Promise<FrameworkChoice | undefined>;
  readonly writeWizardConfig: (input: WriteConfigInput) => Promise<void>;
  readonly showInformationMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly showErrorMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly openExternal: (uri: unknown) => Promise<boolean>;
  readonly parseUri: (url: string) => unknown;
}

const AGENT_PLUGIN_DOCS_URL = 'https://github.com/Dom-303/pinflow#agent-plugins';

const DEFAULT_INTERNAL_DEPS: WizardInternalDeps = {
  detectApps: (cwd) => detectApps(cwd),
  pickAgent: () => pickAgent(),
  pickAppRoot: (cwd, apps) => pickAppRoot(cwd, apps),
  pickFramework: (detectedApp) => pickFramework(detectedApp),
  writeWizardConfig: (input) => writeWizardConfig(input),
  showInformationMessage: (message, ...actions) =>
    vscode.window.showInformationMessage(message, ...actions),
  showErrorMessage: (message, ...actions) =>
    vscode.window.showErrorMessage(message, ...actions),
  openExternal: (uri) =>
    vscode.env.openExternal(uri as Parameters<typeof vscode.env.openExternal>[0]),
  parseUri: (url) => vscode.Uri.parse(url),
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
  // Step 1 — detect apps
  const apps = internal.detectApps(cwd);

  // Step 2 — agent selection
  const agent = await internal.pickAgent();
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

  // Step 6 — notify caller + show success toast
  await deps.onSuccess();
  showSuccessToast(cwd, internal);
}

function showSuccessToast(cwd: string, internal: WizardInternalDeps): void {
  const folderName = path.basename(cwd);

  void internal
    .showInformationMessage(`PinFlow ready in ${folderName}.`, 'Install Agent Plugin')
    .then((action) => {
      if (action === 'Install Agent Plugin') {
        void internal.openExternal(internal.parseUri(AGENT_PLUGIN_DOCS_URL));
      }
    });
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
