import type { PinFlowRunEvidence } from '../run-evidence.js';

export interface RunsWebviewSettings {
  readonly timeFormat: '24h' | '12h';
}

export type ExtToWebviewMessage =
  | {
      readonly type: 'webview:init-ack';
      readonly runs: readonly PinFlowRunEvidence[];
      readonly settings: RunsWebviewSettings;
    }
  | {
      readonly type: 'runs:update';
      readonly runs: readonly PinFlowRunEvidence[];
    }
  | {
      readonly type: 'settings:update';
      readonly settings: RunsWebviewSettings;
    };

export type WebviewToExtMessage =
  | { readonly type: 'webview:ready' }
  | { readonly type: 'run:open-prompt'; readonly runId: string }
  | { readonly type: 'run:open-evidence-file'; readonly filePath: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSettings(value: unknown): value is RunsWebviewSettings {
  return (
    isObject(value) &&
    (value['timeFormat'] === '24h' || value['timeFormat'] === '12h')
  );
}

export function isExtToWebviewMessage(
  value: unknown,
): value is ExtToWebviewMessage {
  if (!isObject(value)) return false;
  const type = value['type'];
  if (type === 'runs:update') {
    return Array.isArray(value['runs']);
  }
  if (type === 'webview:init-ack') {
    return Array.isArray(value['runs']) && isSettings(value['settings']);
  }
  if (type === 'settings:update') {
    return isSettings(value['settings']);
  }
  return false;
}

export function isWebviewToExtMessage(
  value: unknown,
): value is WebviewToExtMessage {
  if (!isObject(value)) return false;
  const type = value['type'];
  if (type === 'webview:ready') return true;
  if (type === 'run:open-prompt') return typeof value['runId'] === 'string';
  if (type === 'run:open-evidence-file')
    return typeof value['filePath'] === 'string';
  return false;
}
