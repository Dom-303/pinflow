/**
 * Wizard step 3 — Framework selection QuickPick.
 * If a framework was auto-detected, offer a confirm/change choice.
 * Otherwise show all options directly.
 * @module
 */
import * as vscode from 'vscode';

import type { DetectedApp } from './app-detection.js';

export type FrameworkChoice = 'vite' | 'webpack' | 'next' | 'nuxt';

interface FrameworkQuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly value: FrameworkChoice;
}

/** Minimal VS Code window surface — test-overridable via DI. */
export interface FrameworkStepDeps {
  readonly showQuickPick: (
    items: readonly FrameworkQuickPickItem[],
    options?: { title?: string; placeHolder?: string },
  ) => Promise<FrameworkQuickPickItem | undefined>;
}

const ALL_FRAMEWORK_ITEMS: readonly FrameworkQuickPickItem[] = [
  { label: 'Vite', value: 'vite' },
  { label: 'Webpack', value: 'webpack' },
  { label: 'Next.js', value: 'next' },
  { label: 'Nuxt', value: 'nuxt' },
];

const DEFAULT_DEPS: FrameworkStepDeps = {
  showQuickPick: (items, options) =>
    vscode.window.showQuickPick([...items], options) as Promise<FrameworkQuickPickItem | undefined>,
};

function buildConfirmItems(detected: FrameworkChoice): readonly FrameworkQuickPickItem[] {
  return [
    { label: `${detected} (detected)`, description: 'use this', value: detected },
    ...ALL_FRAMEWORK_ITEMS.filter((item) => item.value !== detected),
  ];
}

/**
 * Show a framework QuickPick. If `detectedFromApp.framework` is set,
 * the first item is the detected one (acting as the default). Picking any
 * item returns its value; Esc returns `undefined`.
 */
export async function pickFramework(
  detectedFromApp: DetectedApp,
  deps: FrameworkStepDeps = DEFAULT_DEPS,
): Promise<FrameworkChoice | undefined> {
  const items = detectedFromApp.framework
    ? buildConfirmItems(detectedFromApp.framework)
    : ALL_FRAMEWORK_ITEMS;

  const title = detectedFromApp.framework
    ? `Framework detected: ${detectedFromApp.framework}`
    : 'Select framework';

  const picked = await deps.showQuickPick(items, {
    title,
    placeHolder: 'Choose the build framework for this app',
  });

  return picked?.value;
}
