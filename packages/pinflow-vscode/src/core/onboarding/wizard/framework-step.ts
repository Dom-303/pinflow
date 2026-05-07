/**
 * Wizard step — Framework selection.
 * Only used in the manual-path branch (no frontend app detected). When a
 * frontend app is detected, the wizard reads its framework directly from
 * the detector and never reaches this step.
 * @module
 */
import * as vscode from 'vscode';

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

/**
 * Show the framework QuickPick. Returns the picked value, or `undefined`
 * when the user cancels (Esc).
 *
 * @param stepLabel  e.g. `"Step 3/3"` or `""` for single-step wizards.
 *                   Prepended to the QuickPick title.
 */
export async function pickFramework(
  stepLabel: string,
  deps: FrameworkStepDeps = DEFAULT_DEPS,
): Promise<FrameworkChoice | undefined> {
  const titlePrefix = stepLabel ? `${stepLabel} — ` : '';
  const picked = await deps.showQuickPick(ALL_FRAMEWORK_ITEMS, {
    title: `PinFlow Setup · ${titlePrefix}Choose framework`,
    placeHolder: 'No frontend app detected — choose the framework manually',
  });

  return picked?.value;
}
