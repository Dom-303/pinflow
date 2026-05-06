/**
 * Wizard step 2 — App-root selection (QuickPick for monorepos, InputBox for
 * unknown roots, auto-pick for single-app repos).
 * @module
 */
import path from 'node:path';

import * as vscode from 'vscode';

import type { DetectedApp } from './app-detection.js';

interface AppQuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly value: string;
}

/** Minimal VS Code window surface — test-overridable via DI. */
export interface MonorepoStepDeps {
  readonly showQuickPick: (
    items: readonly AppQuickPickItem[],
    options?: { title?: string; placeHolder?: string },
  ) => Promise<AppQuickPickItem | undefined>;
  readonly showInputBox: (options?: {
    title?: string;
    prompt?: string;
    value?: string;
  }) => Promise<string | undefined>;
}

const DEFAULT_DEPS: MonorepoStepDeps = {
  showQuickPick: (items, options) =>
    vscode.window.showQuickPick([...items], options) as Promise<AppQuickPickItem | undefined>,
  showInputBox: (options) => vscode.window.showInputBox(options),
};

/**
 * Resolve the app root for the wizard:
 * - 1 app → auto-pick, no UI shown.
 * - 2+ apps → QuickPick, return chosen path.
 * - 0 apps → InputBox with `cwd` as default; return entered path or `undefined`.
 */
export async function pickAppRoot(
  cwd: string,
  apps: readonly DetectedApp[],
  deps: MonorepoStepDeps = DEFAULT_DEPS,
): Promise<string | undefined> {
  if (apps.length === 1) {
    return apps[0].path;
  }

  if (apps.length > 1) {
    const items: AppQuickPickItem[] = apps.map((app) => ({
      label: path.relative(cwd, app.path) || path.basename(app.path),
      description: app.framework ?? 'unknown framework',
      value: app.path,
    }));

    const picked = await deps.showQuickPick(items, {
      title: 'Select app root',
      placeHolder: 'Multiple package.json files found — choose the app to configure',
    });

    return picked?.value;
  }

  // No apps detected — ask user for manual path
  return deps.showInputBox({
    title: 'Enter app root path',
    prompt: 'No package.json found automatically. Enter the path to your app root.',
    value: cwd,
  });
}
