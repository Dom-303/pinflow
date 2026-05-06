import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';

import type { PinFlowRunEvidence } from '../run-evidence.js';
import {
  isWebviewToExtMessage,
  type ExtToWebviewMessage,
  type FolderStatus,
  type RunsWebviewSettings,
} from './runs-webview-messages.js';

export interface RunsSnapshot {
  readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
  readonly folderStatuses: Readonly<Record<string, FolderStatus>>;
  readonly activeFolder?: string;
}

export interface RunsWebviewProviderDeps {
  readonly extensionUri: vscode.Uri;
  readonly onOpenPrompt: (run: PinFlowRunEvidence) => void;
  readonly getCurrentSnapshot: () => RunsSnapshot;
  readonly getCurrentSettings: () => RunsWebviewSettings;
}

export class RunsWebviewProvider implements vscode.WebviewViewProvider {
  private webviewView: vscode.WebviewView | null = null;

  constructor(private readonly deps: RunsWebviewProviderDeps) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: { readonly state: unknown },
    _token: { readonly isCancellationRequested: boolean },
  ): void {
    this.webviewView = webviewView;
    const distRoot = vscode.Uri.joinPath(
      this.deps.extensionUri,
      'dist',
      'runs-webview',
    );
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [distRoot],
    };
    webviewView.webview.html = this.buildHtml(webviewView.webview, distRoot);

    webviewView.webview.onDidReceiveMessage((message) => {
      if (!isWebviewToExtMessage(message)) return;
      if (message.type === 'webview:ready') {
        const snapshot = this.deps.getCurrentSnapshot();
        const ack: ExtToWebviewMessage = {
          type: 'webview:init-ack',
          runsByFolder: snapshot.runsByFolder,
          folderStatuses: snapshot.folderStatuses,
          activeFolder: snapshot.activeFolder,
          settings: this.deps.getCurrentSettings(),
        };
        void webviewView.webview.postMessage(ack);
        return;
      }
      if (message.type === 'run:open-prompt') {
        const snapshot = this.deps.getCurrentSnapshot();
        for (const runs of Object.values(snapshot.runsByFolder)) {
          const match = runs.find((r) => r.runId === message.runId);
          if (match) {
            this.deps.onOpenPrompt(match);
            return;
          }
        }
      }
    });

    webviewView.onDidDispose(() => {
      this.webviewView = null;
    });
  }

  postRuns(snapshot: RunsSnapshot): void {
    if (!this.webviewView) return;
    const update: ExtToWebviewMessage = {
      type: 'runs:update',
      runsByFolder: snapshot.runsByFolder,
      folderStatuses: snapshot.folderStatuses,
      activeFolder: snapshot.activeFolder,
    };
    void this.webviewView.webview.postMessage(update);
  }

  postSettings(settings: RunsWebviewSettings): void {
    if (!this.webviewView) return;
    const update: ExtToWebviewMessage = { type: 'settings:update', settings };
    void this.webviewView.webview.postMessage(update);
  }

  private buildHtml(webview: vscode.Webview, distRoot: vscode.Uri): string {
    const nonce = randomBytes(16).toString('base64');
    const mainJs = webview.asWebviewUri(
      vscode.Uri.joinPath(distRoot, 'main.js'),
    );
    const litJs = webview.asWebviewUri(vscode.Uri.joinPath(distRoot, 'lit.js'));
    const indexCss = webview.asWebviewUri(
      vscode.Uri.joinPath(distRoot, 'index.css'),
    );
    const codiconsCss = webview.asWebviewUri(
      vscode.Uri.joinPath(distRoot, 'codicon.css'),
    );
    const cspSource = webview.cspSource;
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' ${cspSource}; font-src ${cspSource}; img-src ${cspSource} data:;" />
    <link rel="stylesheet" href="${codiconsCss}" />
    <link rel="stylesheet" href="${indexCss}" />
  </head>
  <body>
    <pinflow-runs-app></pinflow-runs-app>
    <script type="module" nonce="${nonce}" src="${litJs}"></script>
    <script type="module" nonce="${nonce}" src="${mainJs}"></script>
  </body>
</html>`;
  }
}
