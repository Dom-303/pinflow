declare module 'vscode' {
  export interface Disposable {
    dispose(): void;
  }

  export interface ExtensionContext {
    subscriptions: Disposable[];
    readonly globalState: {
      get<T>(key: string): T | undefined;
      get<T>(key: string, defaultValue: T): T;
      update(key: string, value: unknown): Thenable<void>;
    };
  }

  export class Uri {
    readonly fsPath: string;
    static file(path: string): Uri;
    static parse(value: string): Uri;
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
    readonly Collapsed: number;
    readonly Expanded: number;
  };

  export class ThemeColor {
    constructor(id: string);
  }

  export class ThemeIcon {
    constructor(id: string, color?: ThemeColor);
  }

  export class TreeItem {
    label?: string;
    id?: string;
    description?: string;
    tooltip?: string;
    contextValue?: string;
    iconPath?: ThemeIcon | Uri | { light: Uri; dark: Uri };
    command?: {
      command: string;
      title: string;
      arguments?: readonly unknown[];
    };
    constructor(label: string, collapsibleState?: number);
  }

  export interface TreeDataProvider<T> {
    readonly onDidChangeTreeData?: Event<T | undefined | null | void>;
    getTreeItem(element: T): TreeItem;
    getChildren(element?: T): readonly T[] | T[] | Thenable<readonly T[]> | Thenable<T[]>;
  }

  export const StatusBarAlignment: {
    readonly Left: number;
    readonly Right: number;
  };

  export const window: {
    createStatusBarItem(alignment: number, priority?: number): StatusBarItem;
    showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
    showErrorMessage(message: string): Thenable<string | undefined>;
    showInputBox(options?: {
      prompt?: string;
      placeHolder?: string;
      value?: string;
    }): Thenable<string | undefined>;
    showTextDocument(uri: Uri): Thenable<unknown>;
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
    registerCommand<T extends unknown[]>(
      command: string,
      callback: (...args: T) => unknown,
    ): Disposable;
    executeCommand(command: string, ...args: unknown[]): Thenable<unknown>;
  };

  export interface WorkspaceConfiguration {
    get<T>(section: string, defaultValue: T): T;
    get<T>(section: string): T | undefined;
  }

  export interface ConfigurationChangeEvent {
    affectsConfiguration(section: string): boolean;
  }

  export const workspace: {
    workspaceFolders?: Array<{ uri: { fsPath: string } }>;
    onDidChangeWorkspaceFolders(listener: () => void): Disposable;
    onDidChangeConfiguration(
      listener: (event: ConfigurationChangeEvent) => void,
    ): Disposable;
    getConfiguration(section?: string): WorkspaceConfiguration;
  };

  export const env: {
    openExternal(target: Uri): Thenable<boolean>;
  };
}
