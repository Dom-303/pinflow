/**
 * Wizard orchestrator — computes the step plan, runs the steps the user
 * needs to see, gates a reconfigure prompt when configs already exist,
 * writes one config per picked app, then installs the framework plugin
 * and triggers post-install. No spawn, no terminal, no CLI dependency.
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
import { detectExistingConfigs } from './existing-configs.js';
import { runPostInstall } from './post-install.js';
import { installFrameworkPlugin as installFrameworkPluginImpl } from './framework-plugin.js';
import { detectPackageManager } from './package-manager.js';
import { installPackage } from './package-installer.js';
import { patchViteConfig } from './vite-config-patcher.js';
import type { DetectedApp, FrameworkId } from './app-detection.js';
import type { InstalledAgents } from './agent-detection.js';
import type { AgentChoice } from './agent-step.js';
import type { FrameworkChoice } from './framework-step.js';
import type { WriteConfigBatchInput } from './config-writer.js';
import type { RunPostInstallDeps } from './post-install.js';
import type { FrameworkPluginResult } from './framework-plugin.js';

// ---------------------------------------------------------------------------
// Output channel lazy singleton
// ---------------------------------------------------------------------------

let cachedOutputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!cachedOutputChannel) {
    cachedOutputChannel = vscode.window.createOutputChannel('PinFlow Setup');
  }
  return cachedOutputChannel;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RunWizardDeps {
  readonly onSuccess: () => Promise<void> | void;
  readonly runInitInTerminal: (cwd: string) => void;
}

// ---------------------------------------------------------------------------
// Internal DI surface (test-overridable)
// ---------------------------------------------------------------------------

export interface WizardInternalDeps {
  readonly detectApps: (cwd: string) => DetectedApp[];
  readonly detectInstalledAgents: () => Promise<InstalledAgents>;
  readonly detectExistingConfigs: (appPaths: readonly string[]) => Promise<string[]>;
  readonly pickAgent: (
    installedAgents: InstalledAgents,
    stepLabel: string,
  ) => Promise<AgentChoice | undefined>;
  readonly pickAppRoot: (
    cwd: string,
    apps: readonly DetectedApp[],
    stepLabel: string,
  ) => Promise<readonly string[] | undefined>;
  readonly pickFramework: (
    stepLabel: string,
  ) => Promise<FrameworkChoice | undefined>;
  readonly writeWizardConfig: (input: WriteConfigBatchInput) => Promise<void>;
  readonly runPostInstall: (
    agent: AgentChoice,
    cwd: string,
    deps: RunPostInstallDeps,
  ) => Promise<void>;
  readonly showInformationMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly showErrorMessage: (
    message: string,
    ...actions: string[]
  ) => Promise<string | undefined>;
  readonly createTerminal: (options: { name: string; cwd: string }) => {
    sendText: (text: string) => void;
    show: () => void;
  };
  readonly installFrameworkPlugin: (
    appPath: string,
    framework: FrameworkId,
    workspaceRoot: string,
    onOutput: (line: string) => void,
  ) => Promise<FrameworkPluginResult>;
  readonly withProgress: <T>(
    title: string,
    task: (
      report: (progress: { message?: string; increment?: number }) => void,
    ) => Promise<T>,
  ) => Promise<T>;
  readonly outputAppend: (line: string) => void;
  readonly outputShow: () => void;
}

const DEFAULT_INTERNAL_DEPS: WizardInternalDeps = {
  detectApps: (cwd) => detectApps(cwd),
  detectInstalledAgents: () => detectInstalledAgents(),
  detectExistingConfigs: (appPaths) => detectExistingConfigs(appPaths),
  pickAgent: (installedAgents, stepLabel) =>
    pickAgent({
      installedAgents,
      stepLabel,
      showQuickPick: (items, options) =>
        vscode.window.showQuickPick([...items], options) as Promise<(typeof items)[number] | undefined>,
    }),
  pickAppRoot: (cwd, apps, stepLabel) => pickAppRoot(cwd, apps, stepLabel),
  pickFramework: (stepLabel) => pickFramework(stepLabel),
  writeWizardConfig: (input) => writeWizardConfig(input),
  runPostInstall: (agent, cwd, postInstallDeps) =>
    runPostInstall(agent, cwd, postInstallDeps),
  showInformationMessage: (message, ...actions) =>
    vscode.window.showInformationMessage(message, ...actions),
  showErrorMessage: (message, ...actions) =>
    vscode.window.showErrorMessage(message, ...actions),
  createTerminal: (options) => vscode.window.createTerminal(options),
  installFrameworkPlugin: (appPath, framework, workspaceRoot, onOutput) =>
    installFrameworkPluginImpl(appPath, framework, workspaceRoot, onOutput, {
      detectPackageManager,
      installPackage,
      patchViteConfig,
      showSnippetFallback: async ({ appPath, framework, snippet }) => {
        // Try to open the config file for context; fall back to an untitled doc.
        const configUri = vscode.Uri.file(path.join(appPath, 'vite.config.ts'));
        try {
          const doc = await vscode.workspace.openTextDocument(configUri);
          await vscode.window.showTextDocument(doc, { preview: true });
        } catch {
          // Config file doesn't exist — open untitled with the snippet.
          const untitled = await vscode.workspace.openTextDocument({
            content: snippet,
            language: 'typescript',
          });
          await vscode.window.showTextDocument(untitled);
        }

        const label = framework;
        const action = await vscode.window.showInformationMessage(
          `PinFlow: Bitte Snippet für ${label} manuell einfügen.`,
          'Snippet kopieren',
          'Snippet anzeigen',
          'Verstanden',
        );

        if (action === 'Snippet kopieren') {
          await vscode.env.clipboard.writeText(snippet);
        } else if (action === 'Snippet anzeigen') {
          const untitled = await vscode.workspace.openTextDocument({
            content: snippet,
            language: 'typescript',
          });
          await vscode.window.showTextDocument(untitled);
        }
      },
    }),
  withProgress: <T>(
    title: string,
    task: (report: (progress: { message?: string; increment?: number }) => void) => Promise<T>,
  ): Promise<T> =>
    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title },
      (progress) => task((p) => progress.report(p)),
    ) as Promise<T>,
  outputAppend: (line) => getOutputChannel().appendLine(line),
  outputShow: () => getOutputChannel().show(true),
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
// Step plan
// ---------------------------------------------------------------------------

interface StepPlan {
  readonly total: number;
  readonly agentLabel: string;
  readonly appRootLabel: string;
  readonly frameworkLabel: string;     // empty when framework step will be skipped
  readonly frameworkStepNeeded: boolean;
}

/**
 * Compute step plan upfront.
 *
 * - Agent: always shown.
 * - App-root: shown when 0 apps (manual path) or 2+ apps (multi-select);
 *   silent auto-pick for exactly 1 detected app.
 * - Framework: shown only when 0 apps were detected — the user is in the
 *   manual-path branch and we have nothing to read framework from. With
 *   1+ detected apps, every entry already carries its framework (the
 *   detector filters out anything without one) and the wizard just
 *   propagates that through.
 */
function planSteps(apps: readonly DetectedApp[]): StepPlan {
  const appRootShown = apps.length !== 1;
  const frameworkShown = apps.length === 0;

  let count = 1; // agent
  if (appRootShown) count += 1;
  if (frameworkShown) count += 1;

  const fmt = (i: number) => (count === 1 ? '' : `Schritt ${i}/${count}`);

  let nextIdx = 1;
  const agentLabel = fmt(nextIdx++);
  const appRootLabel = appRootShown ? fmt(nextIdx++) : '';
  const frameworkLabel = frameworkShown ? fmt(nextIdx) : '';

  return {
    total: count,
    agentLabel,
    appRootLabel,
    frameworkLabel,
    frameworkStepNeeded: frameworkShown,
  };
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function runWizardSteps(
  cwd: string,
  deps: RunWizardDeps,
  internal: WizardInternalDeps,
): Promise<void> {
  // Phase 1 — detect apps + installed agents in parallel.
  const [apps, installedAgents] = await Promise.all([
    Promise.resolve(internal.detectApps(cwd)),
    internal.detectInstalledAgents(),
  ]);

  const plan = planSteps(apps);

  // Phase 2 — agent step.
  const agent = await internal.pickAgent(installedAgents, plan.agentLabel);
  if (agent === undefined) return;

  // Phase 3 — app-root step.
  const appRoots = await internal.pickAppRoot(cwd, apps, plan.appRootLabel);
  if (appRoots === undefined || appRoots.length === 0) return;

  // Phase 4 — reconfigure consent for picked apps that already have configs.
  const existing = await internal.detectExistingConfigs(appRoots);
  if (existing.length > 0) {
    const proceed = await confirmReconfigure(existing, cwd, internal);
    if (!proceed) return;
  }

  // Phase 5 — framework step. Only fires in the manual-path branch (no FE
  // app detected). For detected apps the framework is already known.
  const manualFramework: FrameworkChoice | undefined = plan.frameworkStepNeeded
    ? await internal.pickFramework(plan.frameworkLabel)
    : undefined;
  if (plan.frameworkStepNeeded && manualFramework === undefined) return;

  // Phase 6 — assemble per-app config inputs.
  const perApp: { readonly appPath: string; readonly framework: FrameworkId }[] = appRoots.map((appPath) => {
    const detected = apps.find((a) => a.path === appPath)?.framework;
    const resolved = detected ?? manualFramework;
    if (resolved === undefined) {
      // Cannot happen: detected apps always carry a framework, and the
      // manual-path branch sets manualFramework before reaching this point.
      throw new Error(`No framework resolved for app ${appPath}`);
    }
    // Map FrameworkChoice bare values ('vite', 'webpack') to FrameworkId.
    const framework: FrameworkId =
      resolved === 'vite'
        ? 'other-vite'
        : resolved === 'webpack'
          ? 'other-webpack'
          : resolved;
    return { appPath, framework };
  });

  // Phase 7 — write configs.
  try {
    await internal.writeWizardConfig({ cwd, agent, perApp });
  } catch (err: unknown) {
    await showFailureToast(cwd, err, deps.runInitInTerminal, internal);
    return;
  }

  // Phase 7.5 — install + auto-patch framework plugin per app.
  const failures: FrameworkPluginResult[] = [];
  const headerSep = '═════════════════════════════════════════════════════════';
  internal.outputAppend(`\n${headerSep}`);
  internal.outputAppend(`PinFlow Setup · ${new Date().toISOString()} · ${cwd}`);
  internal.outputAppend(headerSep);

  await internal.withProgress(
    'PinFlow: Plugin einrichten',
    async (report) => {
      for (let i = 0; i < perApp.length; i++) {
        const entry = perApp[i];
        const rel = path.relative(cwd, entry.appPath) || path.basename(entry.appPath);
        report({ message: `(${i + 1}/${perApp.length}) ${rel}` });
        const result = await internal.installFrameworkPlugin(
          entry.appPath,
          entry.framework,
          cwd,
          (line) => internal.outputAppend(`[${rel}] ${line}`),
        );
        if (result.status === 'install-failed') failures.push(result);
      }
    },
  );

  if (failures.length > 0) {
    const apps = failures
      .map((f) => path.relative(cwd, f.appPath) || path.basename(f.appPath))
      .join(', ');
    const action = await internal.showErrorMessage(
      `Plugin-Setup fehlgeschlagen für: ${apps}.`,
      'Output anzeigen',
    );
    if (action === 'Output anzeigen') internal.outputShow();
  }

  // Phase 8 — refresh + post-install (runs even if Phase 7.5 had failures).
  await deps.onSuccess();

  const postInstallDeps: RunPostInstallDeps = {
    runInstallInTerminal: (terminalCwd, commands, agentLabel) => {
      const terminal = internal.createTerminal({
        name: `PinFlow — ${agentLabel}-Plugin installieren`,
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

async function confirmReconfigure(
  existing: readonly string[],
  cwd: string,
  internal: WizardInternalDeps,
): Promise<boolean> {
  const labels = existing.map((p) => path.relative(cwd, p) || path.basename(p)).join(', ');
  const action = await internal.showInformationMessage(
    `PinFlow ist bereits konfiguriert in: ${labels}. Bestehende Konfiguration überschreiben?`,
    'Überschreiben',
    'Abbrechen',
  );
  return action === 'Überschreiben';
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
      ? `PinFlow-Setup fehlgeschlagen für ${folderName}: ${err.message}`
      : `PinFlow-Setup fehlgeschlagen für ${folderName}.`;

  const action = await internal.showErrorMessage(message, 'Terminal öffnen');
  if (action === 'Terminal öffnen') runInitInTerminal(cwd);
}

