import { vi } from 'vitest';

import type { PinFlowRunEvidence } from '../run-evidence.js';
import { RunsWebviewProvider } from './runs-webview-provider.js';

function createMockWebview() {
  let messageHandler: ((message: unknown) => void) | null = null;
  const webview = {
    html: '',
    options: {} as { enableScripts?: boolean; localResourceRoots?: unknown },
    cspSource: 'vscode-webview://test',
    asWebviewUri: vi.fn(
      (u: { fsPath?: string; toString?: () => string }) =>
        ({
          toString: () =>
            `vscode-webview-uri:${u.fsPath ?? u.toString?.() ?? ''}`,
        }) as never,
    ),
    postMessage: vi.fn(async (_message: unknown) => true),
    onDidReceiveMessage: vi.fn(
      (handler: (message: unknown) => void) => {
        messageHandler = handler;
        return { dispose: vi.fn() };
      },
    ),
  };
  return {
    webview,
    sendFromWebview: (message: unknown) => messageHandler?.(message),
  };
}

function createMockView(
  webview: ReturnType<typeof createMockWebview>['webview'],
) {
  return {
    webview,
    visible: true,
    viewType: 'pinflow.runs',
    show: vi.fn(),
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
  };
}

const sampleRun: PinFlowRunEvidence = {
  annotationId: 'ann_1',
  runId: 'r_1',
  summary: { status: 'processed' },
  summaryPath: '/repo/.pinflow/runs/r_1/summary.json',
  promptPath: '/repo/.pinflow/runs/r_1/prompt.md',
  transcriptPath: null,
  diffPath: null,
  hasDiff: false,
  changedFiles: [],
  additions: 0,
  deletions: 0,
};

const sampleRun2: PinFlowRunEvidence = {
  annotationId: 'ann_2',
  runId: 'r_2',
  summary: { status: 'processed' },
  summaryPath: '/repo2/.pinflow/runs/r_2/summary.json',
  promptPath: '/repo2/.pinflow/runs/r_2/prompt.md',
  transcriptPath: null,
  diffPath: null,
  hasDiff: false,
  changedFiles: [],
  additions: 0,
  deletions: 0,
};

const fakeUri = {
  fsPath: '/ext',
  toString: () => '/ext',
};

describe('RunsWebviewProvider', () => {
  it('sets enableScripts and html on resolveWebviewView', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({ runsByFolder: {} }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );

    expect(wb.webview.options.enableScripts).toBe(true);
    expect(wb.webview.html).toContain('<!doctype html>');
    expect(wb.webview.html).toContain('Content-Security-Policy');
    expect(wb.webview.html).toContain('script-src');
    expect(wb.webview.html).toContain('<pinflow-runs-app>');
  });

  it('does not post anything before webview signals ready', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({ runsByFolder: { '/repo': [sampleRun] } }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );

    expect(wb.webview.postMessage).not.toHaveBeenCalled();
  });

  it('responds to webview:ready with init-ack carrying runsByFolder and settings', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const runsByFolder = { '/repo': [sampleRun] };
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({ runsByFolder, activeFolder: '/repo' }),
      getCurrentSettings: () => ({ timeFormat: '12h' }),
    });

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );
    wb.sendFromWebview({ type: 'webview:ready' });

    expect(wb.webview.postMessage).toHaveBeenCalledWith({
      type: 'webview:init-ack',
      runsByFolder,
      activeFolder: '/repo',
      settings: { timeFormat: '12h' },
    });
  });

  it('postRuns is a no-op when view has not been resolved yet', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const runsByFolder = { '/repo': [sampleRun] };
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({ runsByFolder }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });

    provider.postRuns({ runsByFolder });
    expect(wb.webview.postMessage).not.toHaveBeenCalled();

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );
    provider.postRuns({ runsByFolder });

    expect(wb.webview.postMessage).toHaveBeenCalledWith({
      type: 'runs:update',
      runsByFolder,
      activeFolder: undefined,
    });
  });

  it('postRuns sends activeFolder hint when provided', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const runsByFolder = { '/repo': [sampleRun] };
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({ runsByFolder }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );
    provider.postRuns({ runsByFolder, activeFolder: '/repo' });

    expect(wb.webview.postMessage).toHaveBeenCalledWith({
      type: 'runs:update',
      runsByFolder,
      activeFolder: '/repo',
    });
  });

  it('postSettings sends settings:update once the view is resolved', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt: vi.fn(),
      getCurrentSnapshot: () => ({ runsByFolder: {} }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );
    provider.postSettings({ timeFormat: '12h' });

    expect(wb.webview.postMessage).toHaveBeenCalledWith({
      type: 'settings:update',
      settings: { timeFormat: '12h' },
    });
  });

  it('routes run:open-prompt to onOpenPrompt via cross-folder lookup', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const onOpenPrompt = vi.fn();
    // r_2 lives in the second folder — proves lookup walks past the first folder
    const runsByFolder = { '/repo': [sampleRun], '/repo2': [sampleRun2] };
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt,
      getCurrentSnapshot: () => ({ runsByFolder }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );
    wb.sendFromWebview({ type: 'run:open-prompt', runId: 'r_2' });

    expect(onOpenPrompt).toHaveBeenCalledWith(sampleRun2);
  });

  it('ignores malformed messages from the webview', () => {
    const wb = createMockWebview();
    const view = createMockView(wb.webview);
    const onOpenPrompt = vi.fn();
    const provider = new RunsWebviewProvider({
      extensionUri: fakeUri as never,
      onOpenPrompt,
      getCurrentSnapshot: () => ({ runsByFolder: { '/repo': [sampleRun] } }),
      getCurrentSettings: () => ({ timeFormat: '24h' }),
    });

    provider.resolveWebviewView(
      view as never,
      { state: undefined } as never,
      { isCancellationRequested: false } as never,
    );
    wb.sendFromWebview({ type: 'invalid' });
    wb.sendFromWebview('not an object');
    wb.sendFromWebview(null);

    expect(onOpenPrompt).not.toHaveBeenCalled();
  });
});
