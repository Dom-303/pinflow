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

function buildDetectedItems(detected: FrameworkChoice): readonly FrameworkQuickPickItem[] {
  return [
    { label: ALL_FRAMEWORK_ITEMS.find((i) => i.value === detected)?.label ?? detected, description: '✓ erkannt', value: detected },
    ...ALL_FRAMEWORK_ITEMS.filter((item) => item.value !== detected),
  ];
}

/**
 * Show a framework QuickPick. If `detectedFromApp.framework` is set,
 * the detected item is first with a `'✓ erkannt'` badge. When nothing was
 * detected the placeholder hint guides the user to pick manually.
 * Picking any item returns its value; Esc returns `undefined`.
 */
export async function pickFramework(
  detectedFromApp: DetectedApp,
  deps: FrameworkStepDeps = DEFAULT_DEPS,
): Promise<FrameworkChoice | undefined> {
  const items = detectedFromApp.framework
    ? buildDetectedItems(detectedFromApp.framework)
    : ALL_FRAMEWORK_ITEMS;

  const placeHolder = detectedFromApp.framework
    ? 'Choose the build framework for this app'
    : 'Konnte kein Framework erkennen — wähle manuell';

  const picked = await deps.showQuickPick(items, {
    title: 'PinFlow Setup · Schritt 3/3 — Framework wählen',
    placeHolder,
  });

  return picked?.value;
}
