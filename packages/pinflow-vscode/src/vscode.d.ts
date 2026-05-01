declare module 'vscode' {
  export interface Disposable {
    dispose(): void;
  }

  export interface ExtensionContext {
    subscriptions: Disposable[];
  }

  export interface StatusBarItem extends Disposable {
    text: string;
    tooltip?: string;
    command?: string;
    show(): void;
  }

  export interface Event<T> {
    (listener: (event: T) => unknown): Disposable;
  }

  export class EventEmitter<T> implements Disposable {
    readonly event: Event<T>;
    fire(data: T): void;
    dispose(): void;
  }

  export const TreeItemCollapsibleState: {
    readonly None: number;
  };

  export class TreeItem {
    label?: string;
    description?: string;
    constructor(label: string, collapsibleState?: number);
  }

  export interface TreeDataProvider<T> {
    readonly onDidChangeTreeData?: Event<T | undefined | null | void>;
    getTreeItem(element: T): TreeItem;
    getChildren(element?: T): T[] | Thenable<T[]>;
  }

  export const StatusBarAlignment: {
    readonly Left: number;
    readonly Right: number;
  };

  export const window: {
    createStatusBarItem(alignment: number, priority?: number): StatusBarItem;
    showInformationMessage(message: string): Thenable<string | undefined>;
    createTerminal(options: { name: string; cwd?: string }): {
      sendText(text: string): void;
      show(): void;
    };
    registerTreeDataProvider<T>(
      viewId: string,
      treeDataProvider: TreeDataProvider<T>,
    ): Disposable;
  };

  export const commands: {
    registerCommand(
      command: string,
      callback: (...args: unknown[]) => unknown,
    ): Disposable;
    executeCommand(command: string): Thenable<unknown>;
  };

  export const workspace: {
    workspaceFolders?: Array<{ uri: { fsPath: string } }>;
    onDidChangeWorkspaceFolders(listener: () => void): Disposable;
  };
}
