declare module 'vscode' {
  export interface Disposable {
    dispose(): void;
  }

  export interface ExtensionContext {
    subscriptions: Disposable[];
    readonly extensionUri: Uri;
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
    static joinPath(base: Uri, ...segments: string[]): Uri;
  }

  export interface Webview {
    html: string;
    options: {
      enableScripts?: boolean;
      localResourceRoots?: readonly Uri[];
    };
    readonly cspSource: string;
    asWebviewUri(localResource: Uri): Uri;
    postMessage(message: unknown): Thenable<boolean>;
    onDidReceiveMessage(
      listener: (message: unknown) => unknown,
      thisArgs?: unknown,
      disposables?: Disposable[],
    ): Disposable;
  }

  export interface WebviewView {
    readonly webview: Webview;
    readonly visible: boolean;
    readonly viewType: string;
    show(preserveFocus?: boolean): void;
    onDidDispose(
      listener: () => void,
      thisArgs?: unknown,
      disposables?: Disposable[],
    ): Disposable;
  }

  export interface WebviewViewProvider {
    resolveWebviewView(
      webviewView: WebviewView,
      context: { readonly state: unknown },
      token: { readonly isCancellationRequested: boolean },
    ): void | Thenable<void>;
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
    showQuickPick<T extends { label: string }>(
      items: readonly T[] | Thenable<readonly T[]>,
      options?: {
        title?: string;
        placeHolder?: string;
        canPickMany?: boolean;
      },
    ): Thenable<T | undefined>;
    showTextDocument(uri: Uri): Thenable<unknown>;
    createTerminal(options: { name: string; cwd?: string }): {
      sendText(text: string): void;
      show(): void;
    };
    registerTreeDataProvider<T>(
      viewId: string,
      treeDataProvider: TreeDataProvider<T>,
    ): Disposable;
    registerWebviewViewProvider(
      viewType: string,
      provider: WebviewViewProvider,
      options?: { webviewOptions?: { retainContextWhenHidden?: boolean } },
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
    update(section: string, value: unknown, target?: number | boolean): Thenable<void>;
  }

  export const ConfigurationTarget: {
    readonly Global: number;
    readonly Workspace: number;
    readonly WorkspaceFolder: number;
  };

  export interface ConfigurationChangeEvent {
    affectsConfiguration(section: string): boolean;
  }

  export interface WorkspaceFoldersChangeEvent {
    readonly added: ReadonlyArray<{ uri: { fsPath: string } }>;
    readonly removed: ReadonlyArray<{ uri: { fsPath: string } }>;
  }

  export const workspace: {
    workspaceFolders?: Array<{ uri: { fsPath: string } }>;
    onDidChangeWorkspaceFolders(listener: (event: WorkspaceFoldersChangeEvent) => void): Disposable;
    onDidChangeConfiguration(
      listener: (event: ConfigurationChangeEvent) => void,
    ): Disposable;
    getConfiguration(section?: string): WorkspaceConfiguration;
  };

  export const env: {
    openExternal(target: Uri): Thenable<boolean>;
  };
}
