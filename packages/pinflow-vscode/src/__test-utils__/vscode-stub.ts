// Minimal runtime stub of the `vscode` module for vitest. The real module
// is provided by the VS Code extension host at runtime; tests mock it via
// vi.mock or use the Uri.joinPath helper exposed here.
import { vi } from 'vitest';

export const Uri = {
  joinPath: (base: { fsPath: string }, ...segments: string[]) => ({
    fsPath: [base.fsPath, ...segments].join('/'),
    toString: () => [base.fsPath, ...segments].join('/'),
  }),
  parse: (url: string) => ({ toString: () => url }),
};

export const ProgressLocation = {
  Notification: 15,
  SourceControl: 1,
  Window: 10,
} as const;

export const window = {
  withProgress: vi.fn(
    async (_options: unknown, task: (p: { report: () => void }) => Promise<unknown>) =>
      task({ report: vi.fn() }),
  ),
  showInformationMessage: vi.fn(async (_message: string, ..._items: string[]) => undefined as string | undefined),
  showErrorMessage: vi.fn(async (_message: string, ..._items: string[]) => undefined as string | undefined),
};

export const env = {
  openExternal: vi.fn(async (_uri: unknown) => true),
};

export const commands = {
  executeCommand: vi.fn(async (_command: string, ..._args: unknown[]) => undefined),
};
