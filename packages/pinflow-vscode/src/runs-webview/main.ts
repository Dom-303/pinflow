import './components/pinflow-lifecycle-pill.js';
import './components/pinflow-run-card.js';
import './components/pinflow-runs-app.js';
import './components/pinflow-runs-header.js';
import './components/pinflow-empty-state.js';
import {
  isExtToWebviewMessage,
  type WebviewToExtMessage,
} from '../core/views/runs-webview-messages.js';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

function postToHost(message: WebviewToExtMessage): void {
  vscode.postMessage(message);
}

const app = document.querySelector('pinflow-runs-app');
if (!app) {
  console.warn(
    'pinflow-runs-app element not registered yet — components land in Tasks 7-9',
  );
} else {
  window.addEventListener('message', (event) => {
    if (!isExtToWebviewMessage(event.data)) return;
    const data = event.data;
    if (data.type === 'webview:init-ack') {
      (app as any).runsByFolder = data.runsByFolder;
      (app as any).activeFolder = data.activeFolder;
      (app as any).settings = data.settings;
    } else if (data.type === 'runs:update') {
      (app as any).runsByFolder = data.runsByFolder;
      (app as any).activeFolder = data.activeFolder;
    } else if (data.type === 'settings:update') {
      (app as any).settings = data.settings;
    }
  });

  app.addEventListener('pinflow-card:click', (event) => {
    const detail = (event as CustomEvent<{ runId: string }>).detail;
    if (detail?.runId) {
      postToHost({ type: 'run:open-prompt', runId: detail.runId });
    }
  });
}

postToHost({ type: 'webview:ready' });
