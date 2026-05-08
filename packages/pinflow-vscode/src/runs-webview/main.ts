import './components/pinflow-lifecycle-pill.js';
import './components/pinflow-run-card.js';
import './components/pinflow-run-detail.js';
import './components/pinflow-runs-app.js';
import './components/pinflow-runs-header.js';
import './components/pinflow-empty-state.js';
import './components/pinflow-compare-panel.js';
import type { PinflowRunsApp } from './components/pinflow-runs-app.js';
import type { PinFlowRunEvidence } from '../core/run-evidence.js';
import {
  isExtToWebviewMessage,
  type RunsWebviewSettings,
  type WebviewToExtMessage,
} from '../core/views/runs-webview-messages.js';

interface PinflowRunsAppProps {
  runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
  folderStatuses: Readonly<Record<string, 'configured' | 'not-configured'>>;
  activeFolder: string | undefined;
  settings: RunsWebviewSettings;
}

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

function postToHost(message: WebviewToExtMessage): void {
  vscode.postMessage(message);
}

const app = document.querySelector('pinflow-runs-app') as
  | (Element & PinflowRunsAppProps & PinflowRunsApp)
  | null;
if (!app) {
  console.warn('pinflow-runs-app element not found in webview DOM');
} else {
  window.addEventListener('message', (event) => {
    if (!isExtToWebviewMessage(event.data)) return;
    const data = event.data;
    if (data.type === 'webview:init-ack') {
      app.runsByFolder = data.runsByFolder;
      app.folderStatuses = data.folderStatuses;
      app.activeFolder = data.activeFolder;
      app.settings = data.settings;
    } else if (data.type === 'runs:update') {
      app.runsByFolder = data.runsByFolder;
      app.folderStatuses = data.folderStatuses;
      app.activeFolder = data.activeFolder;
    } else if (data.type === 'settings:update') {
      app.settings = data.settings;
    } else if (data.type === 'transcript:initial') {
      app.applyTranscriptInitial(data.runId, data.text);
    } else if (data.type === 'transcript:append') {
      app.applyTranscriptAppend(data.runId, data.delta);
    } else if (data.type === 'diff:update') {
      app.applyDiffUpdate(data.runId, data.changedFiles);
    }
  });

  app.addEventListener('pinflow-runs:active-change', (event) => {
    const detail = (event as CustomEvent<{ type: 'expand' | 'collapse'; runId: string }>).detail;
    if (!detail?.runId) return;
    if (detail.type === 'expand') {
      postToHost({ type: 'run:expand', runId: detail.runId });
    } else {
      postToHost({ type: 'run:collapse', runId: detail.runId });
    }
  });

  app.addEventListener('pinflow-detail:open-diff', (event) => {
    const detail = (event as CustomEvent<{ runId: string; filePath: string }>).detail;
    if (!detail?.runId || !detail?.filePath) return;
    postToHost({
      type: 'run:open-diff',
      runId: detail.runId,
      filePath: detail.filePath,
    });
  });

  app.addEventListener('pinflow-detail:open-prompt', (event) => {
    const detail = (event as CustomEvent<{ runId: string }>).detail;
    if (!detail?.runId) return;
    postToHost({ type: 'run:open-prompt', runId: detail.runId });
  });

  window.addEventListener('setup-clicked', (event) => {
    const detail = (event as CustomEvent<{ folderPath: string }>).detail;
    postToHost({ type: 'webview:run-init', folder: detail.folderPath });
  });
}

postToHost({ type: 'webview:ready' });
