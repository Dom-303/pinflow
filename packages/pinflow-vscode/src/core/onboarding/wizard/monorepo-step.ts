/**
 * Wizard step — App-root selection.
 * - 1 app → silent auto-pick.
 * - 2+ apps → multi-select QuickPick with all items pre-checked.
 * - 0 apps → InputBox for a manual path.
 * @module
 */
import path from 'node:path';

import * as vscode from 'vscode';

import { FRAMEWORKS } from './app-detection.js';
import type { DetectedApp, FrameworkId } from './app-detection.js';

interface AppQuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly picked: boolean;
  readonly value: string;
}

/** Minimal VS Code window surface — test-overridable via DI. */
export interface MonorepoStepDeps {
  readonly showQuickPick: (
    items: readonly AppQuickPickItem[],
    options: {
      readonly title?: string;
      readonly placeHolder?: string;
      readonly canPickMany: true;
    },
  ) => Promise<readonly AppQuickPickItem[] | undefined>;
  readonly showInputBox: (options?: {
    readonly title?: string;
    readonly prompt?: string;
    readonly value?: string;
  }) => Promise<string | undefined>;
}

function frameworkLabel(id: FrameworkId): string {
  return FRAMEWORKS.find((f) => f.id === id)?.label ?? id;
}

const DEFAULT_DEPS: MonorepoStepDeps = {
  showQuickPick: (items, options) =>
    vscode.window.showQuickPick([...items], options) as Promise<readonly AppQuickPickItem[] | undefined>,
  showInputBox: (options) => vscode.window.showInputBox(options),
};

/**
 * Resolve one or more app roots for the wizard.
 *
 * @param stepLabel  e.g. `"Schritt 2/3"` or `""` for single-step wizards.
 *
 * @returns
 *  - `[singlePath]` when exactly one app was detected (silent auto-pick).
 *  - The user's multi-select picks (1..N) when 2+ apps were detected.
 *  - `[manualPath]` from the InputBox when 0 apps were detected.
 *  - `undefined` when the user cancelled or deselected everything.
 */
export async function pickAppRoot(
  cwd: string,
  apps: readonly DetectedApp[],
  stepLabel: string,
  deps: MonorepoStepDeps = DEFAULT_DEPS,
): Promise<readonly string[] | undefined> {
  if (apps.length === 1) {
    return [apps[0].path];
  }

  const titlePrefix = stepLabel ? `${stepLabel} — ` : '';

  if (apps.length > 1) {
    const items: AppQuickPickItem[] = apps.map((app) => ({
      label: path.relative(cwd, app.path) || path.basename(app.path),
      description: frameworkLabel(app.framework),
      picked: true,
      value: app.path,
    }));

    const picked = await deps.showQuickPick(items, {
      title: `PinFlow Setup · ${titlePrefix}Apps auswählen`,
      placeHolder: 'Mehrere Frontend-Apps gefunden — wähle eine oder mehrere',
      canPickMany: true,
    });

    if (picked === undefined) return undefined;
    if (picked.length === 0) return undefined;
    return picked.map((p) => p.value);
  }

  const entered = await deps.showInputBox({
    title: `PinFlow Setup · ${titlePrefix}App-Root wählen`,
    prompt:
      'Keine Frontend-App (Vite/Webpack/Next.js/Nuxt) erkannt. Pfad zum App-Root eingeben:',
    value: cwd,
  });

  if (entered === undefined || entered.trim() === '') return undefined;
  return [entered];
}
