// Minimal runtime stub of the `vscode` module for vitest. The real module
// is provided by the VS Code extension host at runtime; tests mock it via
// vi.mock or use the Uri.joinPath helper exposed here.
import { vi } from 'vitest';

export const Uri = {
  joinPath: (base: { fsPath: string }, ...segments: string[]) => ({
    fsPath: [base.fsPath, ...segments].join('/'),
    toString: () => [base.fsPath, ...segments].join('/'),
  }),
};

export const commands = {
  executeCommand: vi.fn(async (_command: string, ..._args: unknown[]) => undefined),
};
