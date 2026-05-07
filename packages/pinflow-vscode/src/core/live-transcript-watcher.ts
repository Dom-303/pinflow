import { readFile, stat } from 'node:fs/promises';
import * as vscode from 'vscode';

import { parseDiff } from './run-evidence.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from './run-evidence.js';

export type TranscriptEvent =
  | { readonly type: 'transcript:initial'; readonly runId: string; readonly text: string; readonly isLive: boolean }
  | { readonly type: 'transcript:append'; readonly runId: string; readonly delta: string }
  | { readonly type: 'diff:update'; readonly runId: string; readonly changedFiles: readonly PinFlowChangedFile[] };

export class LiveTranscriptWatcher {
  private disposed = false;
  private lastReadByteOffset = 0;
  private readonly watchers: vscode.Disposable[] = [];

  /** Resolves once the initial read + watcher setup is complete. */
  readonly ready: Promise<void>;

  constructor(
    private readonly evidence: PinFlowRunEvidence,
    private readonly emit: (event: TranscriptEvent) => void,
  ) {
    this.ready = this.start();
  }

  private get runId(): string {
    return this.evidence.runId ?? this.evidence.summaryPath;
  }

  private get isLive(): boolean {
    return this.evidence.summary?.status === 'processing';
  }

  private async start(): Promise<void> {
    if (this.evidence.transcriptPath) {
      await this.emitInitialTranscript();
      this.attachTranscriptWatcher(this.evidence.transcriptPath);
    } else {
      this.emit({ type: 'transcript:initial', runId: this.runId, text: '', isLive: this.isLive });
    }
    if (this.evidence.diffPath) {
      this.attachDiffWatcher(this.evidence.diffPath);
    }
  }

  private async emitInitialTranscript(): Promise<void> {
    const filePath = this.evidence.transcriptPath;
    if (!filePath) return;
    let text = '';
    try {
      text = await readFile(filePath, 'utf8');
    } catch {} // eslint-disable-line no-empty
    this.lastReadByteOffset = Buffer.byteLength(text, 'utf8');
    if (this.disposed) return;
    this.emit({ type: 'transcript:initial', runId: this.runId, text, isLive: this.isLive });
  }

  private attachTranscriptWatcher(filePath: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(filePath);
    const onChange = () => void this.handleTranscriptChange(filePath);
    this.watchers.push(
      watcher.onDidChange(onChange),
      watcher.onDidCreate(onChange),
      watcher,
    );
  }

  private attachDiffWatcher(filePath: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(filePath);
    const onChange = () => void this.handleDiffChange(filePath);
    this.watchers.push(
      watcher.onDidChange(onChange),
      watcher.onDidCreate(onChange),
      watcher.onDidDelete(() => {
        if (this.disposed) return;
        this.emit({ type: 'diff:update', runId: this.runId, changedFiles: [] });
      }),
      watcher,
    );
  }

  private async handleTranscriptChange(filePath: string): Promise<void> {
    if (this.disposed) return;
    let size: number;
    try {
      size = (await stat(filePath)).size;
    } catch {
      return;
    }
    if (size < this.lastReadByteOffset) {
      await this.emitInitialTranscript();
      return;
    }
    if (size === this.lastReadByteOffset) return;
    let delta: string;
    try {
      const fullText = await readFile(filePath, 'utf8');
      delta = fullText.slice(this.lastReadByteOffset);
    } catch {
      return;
    }
    this.lastReadByteOffset = size;
    if (this.disposed) return;
    this.emit({ type: 'transcript:append', runId: this.runId, delta });
  }

  private async handleDiffChange(filePath: string): Promise<void> {
    if (this.disposed) return;
    let diffText = '';
    try {
      diffText = await readFile(filePath, 'utf8');
    } catch {} // eslint-disable-line no-empty
    if (this.disposed) return;
    const parsed = parseDiff(diffText);
    this.emit({ type: 'diff:update', runId: this.runId, changedFiles: parsed.changedFiles });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const w of this.watchers) {
      try { w.dispose(); } catch {} // eslint-disable-line no-empty
    }
    this.watchers.length = 0;
  }
}
