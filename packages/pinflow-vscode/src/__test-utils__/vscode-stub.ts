// Minimal runtime stub of the `vscode` module for vitest. The real module
// is provided by the VS Code extension host at runtime; tests mock it via
// vi.mock or use the Uri.joinPath helper exposed here.
import { vi } from 'vitest';

type ChangeHandler = () => void;

interface WatcherSlot {
  change: ChangeHandler[];
  create: ChangeHandler[];
  delete: ChangeHandler[];
}

const watcherHandlers = new Map<string, WatcherSlot>();

function createFileSystemWatcher(globPattern: string) {
  const slot: WatcherSlot = { change: [], create: [], delete: [] };
  watcherHandlers.set(globPattern, slot);
  return {
    onDidChange: (l: ChangeHandler) => {
      slot.change.push(l);
      return { dispose: () => { slot.change = slot.change.filter((h) => h !== l); } };
    },
    onDidCreate: (l: ChangeHandler) => {
      slot.create.push(l);
      return { dispose: () => { slot.create = slot.create.filter((h) => h !== l); } };
    },
    onDidDelete: (l: ChangeHandler) => {
      slot.delete.push(l);
      return { dispose: () => { slot.delete = slot.delete.filter((h) => h !== l); } };
    },
    dispose: () => { watcherHandlers.delete(globPattern); },
  };
}

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

export const workspace = {
  createFileSystemWatcher,
  __triggerChange: (filePath: string) => {
    const slot = watcherHandlers.get(filePath);
    if (!slot) return;
    for (const h of slot.change) h();
  },
  __triggerCreate: (filePath: string) => {
    const slot = watcherHandlers.get(filePath);
    if (!slot) return;
    for (const h of slot.create) h();
  },
  __triggerDelete: (filePath: string) => {
    const slot = watcherHandlers.get(filePath);
    if (!slot) return;
    for (const h of slot.delete) h();
  },
};
