/**
 * Wizard step — Framework selection.
 * If the app's framework was auto-detected, returns synchronously after a
 * fire-and-forget toast. Otherwise prompts the user to pick from the four
 * supported options.
 * @module
 */
import * as vscode from 'vscode';

import type { DetectedApp } from './app-detection.js';

export type FrameworkChoice = 'vite' | 'webpack' | 'next' | 'nuxt';

interface FrameworkQuickPickItem {
  readonly label: string;
  readonly value: FrameworkChoice;
}

/** Minimal VS Code window surface — test-overridable via DI. */
export interface FrameworkStepDeps {
  readonly showQuickPick: (
    items: readonly FrameworkQuickPickItem[],
    options?: { title?: string; placeHolder?: string },
  ) => Promise<FrameworkQuickPickItem | undefined>;
  readonly showInformationMessage: (message: string) => void;
}

const ALL_FRAMEWORK_ITEMS: readonly FrameworkQuickPickItem[] = [
  { label: 'Vite', value: 'vite' },
  { label: 'Webpack', value: 'webpack' },
  { label: 'Next.js', value: 'next' },
  { label: 'Nuxt', value: 'nuxt' },
];

const FRAMEWORK_LABELS: Record<FrameworkChoice, string> = {
  vite: 'Vite',
  webpack: 'Webpack',
  next: 'Next.js',
  nuxt: 'Nuxt',
};

const DEFAULT_DEPS: FrameworkStepDeps = {
  showQuickPick: (items, options) =>
    vscode.window.showQuickPick([...items], options) as Promise<FrameworkQuickPickItem | undefined>,
  showInformationMessage: (message) => {
    void vscode.window.showInformationMessage(message);
  },
};

/**
 * Resolve the framework for an app.
 *
 * - If `detectedFromApp.framework` is set → fire silent info toast and return
 *   the detected framework synchronously (no QuickPick).
 * - Otherwise → show the QuickPick. Picking returns the value; Esc returns
 *   `undefined`.
 *
 * @param stepLabel  e.g. `"Schritt 3/3"` or `""` for single-step wizards.
 *                   Prepended to the QuickPick title when shown.
 */
export async function pickFramework(
  detectedFromApp: DetectedApp,
  stepLabel: string,
  deps: FrameworkStepDeps = DEFAULT_DEPS,
): Promise<FrameworkChoice | undefined> {
  if (detectedFromApp.framework) {
    deps.showInformationMessage(
      `Framework erkannt: ${FRAMEWORK_LABELS[detectedFromApp.framework]}`,
    );
    return detectedFromApp.framework;
  }

  const titlePrefix = stepLabel ? `${stepLabel} — ` : '';
  const picked = await deps.showQuickPick(ALL_FRAMEWORK_ITEMS, {
    title: `PinFlow Setup · ${titlePrefix}Framework wählen`,
    placeHolder: 'Konnte kein Framework erkennen — wähle manuell',
  });

  return picked?.value;
}
