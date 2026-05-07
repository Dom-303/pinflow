/**
 * Hand-typed message protocol between the host-side `RunsWebviewProvider`
 * and the webview-side Lit app, with runtime type guards for cross-boundary
 * validation.
 *
 * @remarks
 * Deliberately deviates from the project-wide schema-first convention
 * (CLAUDE.md: "Define Zod schemas, derive types with z.infer<>"). Three
 * reasons:
 *   1. Both ends of `postMessage` are owned by us — there is no untrusted
 *      external input that needs Zod's parse-and-throw safety net.
 *   2. The webview bundle ships to users as part of the extension; adding
 *      Zod (~12 KB gzipped) for ~50 lines of type guards is not worth the
 *      bundle weight.
 *   3. Consistent with `run-evidence.ts` which already hand-types its
 *      shapes for the same reasons.
 *
 * `runsByFolder` values are shallow-validated (Array.isArray per entry) only
 * — individual `PinFlowRunEvidence` elements are NOT deep-checked. This is
 * acceptable because the producer of these messages is `extension.ts`,
 * which already constructs them from typed `PinFlowRunEvidence` instances.
 */
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../run-evidence.js';

export interface RunsWebviewSettings {
  readonly timeFormat: '24h' | '12h';
}

export type FolderStatus = 'configured' | 'not-configured';

export type ExtToWebviewMessage =
  | {
      readonly type: 'webview:init-ack';
      readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
      readonly folderStatuses: Readonly<Record<string, FolderStatus>>;
      readonly activeFolder?: string;
      readonly settings: RunsWebviewSettings;
    }
  | {
      readonly type: 'runs:update';
      readonly runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>>;
      readonly folderStatuses: Readonly<Record<string, FolderStatus>>;
      readonly activeFolder?: string;
    }
  | {
      readonly type: 'settings:update';
      readonly settings: RunsWebviewSettings;
    }
  | {
      readonly type: 'transcript:initial';
      readonly runId: string;
      readonly text: string;
      readonly isLive: boolean;
    }
  | {
      readonly type: 'transcript:append';
      readonly runId: string;
      readonly delta: string;
    }
  | {
      readonly type: 'diff:update';
      readonly runId: string;
      readonly changedFiles: readonly PinFlowChangedFile[];
    };

export type WebviewToExtMessage =
  | { readonly type: 'webview:ready' }
  | { readonly type: 'webview:run-init'; readonly folder: string }
  | { readonly type: 'run:open-prompt'; readonly runId: string }
  | { readonly type: 'run:open-evidence-file'; readonly filePath: string }
  | { readonly type: 'run:expand'; readonly runId: string }
  | { readonly type: 'run:collapse'; readonly runId: string }
  | { readonly type: 'run:open-diff'; readonly runId: string; readonly filePath: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSettings(value: unknown): value is RunsWebviewSettings {
  return (
    isObject(value) &&
    (value['timeFormat'] === '24h' || value['timeFormat'] === '12h')
  );
}

function isRunsByFolder(value: unknown): value is Record<string, unknown[]> {
  if (!isObject(value)) return false;
  return Object.values(value).every((v) => Array.isArray(v));
}

function isFolderStatus(value: unknown): value is FolderStatus {
  return value === 'configured' || value === 'not-configured';
}

function isFolderStatuses(
  value: unknown,
): value is Record<string, FolderStatus> {
  if (!isObject(value)) return false;
  return Object.values(value).every(isFolderStatus);
}

export function isExtToWebviewMessage(
  value: unknown,
): value is ExtToWebviewMessage {
  if (!isObject(value)) return false;
  const type = value['type'];
  if (type === 'runs:update') {
    return (
      isRunsByFolder(value['runsByFolder']) &&
      isFolderStatuses(value['folderStatuses'])
    );
  }
  if (type === 'webview:init-ack') {
    return (
      isRunsByFolder(value['runsByFolder']) &&
      isFolderStatuses(value['folderStatuses']) &&
      isSettings(value['settings'])
    );
  }
  if (type === 'settings:update') {
    return isSettings(value['settings']);
  }
  if (type === 'transcript:initial') {
    return (
      typeof value['runId'] === 'string' &&
      typeof value['text'] === 'string' &&
      typeof value['isLive'] === 'boolean'
    );
  }
  if (type === 'transcript:append') {
    return (
      typeof value['runId'] === 'string' &&
      typeof value['delta'] === 'string'
    );
  }
  if (type === 'diff:update') {
    return (
      typeof value['runId'] === 'string' &&
      Array.isArray(value['changedFiles'])
    );
  }
  return false;
}

export function isWebviewToExtMessage(
  value: unknown,
): value is WebviewToExtMessage {
  if (!isObject(value)) return false;
  const type = value['type'];
  if (type === 'webview:ready') return true;
  if (type === 'webview:run-init') {
    return typeof value['folder'] === 'string' && value['folder'].length > 0;
  }
  if (type === 'run:open-prompt') return typeof value['runId'] === 'string';
  if (type === 'run:open-evidence-file')
    return typeof value['filePath'] === 'string';
  if (type === 'run:expand') return typeof value['runId'] === 'string';
  if (type === 'run:collapse') return typeof value['runId'] === 'string';
  if (type === 'run:open-diff') {
    return (
      typeof value['runId'] === 'string' &&
      typeof value['filePath'] === 'string'
    );
  }
  return false;
}
