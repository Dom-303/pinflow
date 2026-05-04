// TODO(Task 7): import './components/pinflow-lifecycle-pill.js';
// TODO(Task 8): import './components/pinflow-run-card.js';
// TODO(Task 9): import './components/pinflow-runs-app.js';
// TODO(Task 9): import './components/pinflow-runs-header.js';
// TODO(Task 9): import './components/pinflow-empty-state.js';
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
      (app as unknown as { runs: readonly unknown[]; settings: unknown }).runs =
        data.runs;
      (app as unknown as { settings: unknown }).settings = data.settings;
    } else if (data.type === 'runs:update') {
      (app as unknown as { runs: readonly unknown[] }).runs = data.runs;
    } else if (data.type === 'settings:update') {
      (app as unknown as { settings: unknown }).settings = data.settings;
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
