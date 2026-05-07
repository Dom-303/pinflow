import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';

const STICKY_BOTTOM_THRESHOLD_PX = 32;

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function formatDuration(startedAt: string | undefined, finishedAt: string | undefined): string {
  if (!startedAt || !finishedAt) return '';
  try {
    const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '';
    if (ms < 1000) return `${ms}ms`;
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}m ${rs}s`;
  } catch {
    return '';
  }
}

@customElement('pinflow-run-detail')
export class PinflowRunDetail extends LitElement {
  @property({ attribute: false }) run: PinFlowRunEvidence | null = null;
  @property({ attribute: false }) transcriptText = '';
  @property({ attribute: false }) changedFiles: readonly PinFlowChangedFile[] = [];
  @property({ type: Boolean }) isLive = false;

  private wasAtBottom = true;

  static styles = css`
    :host {
      display: block;
      padding: 6px 4px 4px;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      color: var(--pf-text);
    }
    .request {
      padding: 8px 10px;
      background: var(--pf-card-surface);
      border: 1px solid var(--pf-border);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .request .intent {
      font-size: 12px;
      color: var(--pf-text);
      line-height: 1.4;
      word-break: break-word;
    }
    .request .source {
      margin-top: 4px;
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 10px;
      color: var(--pf-text-muted);
    }
    .request .meta {
      margin-top: 4px;
      font-size: 10px;
      color: var(--pf-text-muted);
    }
    pre.transcript {
      max-height: 220px;
      overflow-y: auto;
      margin: 0 0 8px;
      padding: 8px 10px;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #d4d4d4);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      border-radius: 4px;
      border: 1px solid var(--pf-border);
    }
    pre.transcript:empty::before {
      content: 'Waiting for transcript output…';
      color: var(--pf-text-muted);
      font-style: italic;
    }
    .files-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      color: var(--pf-text-muted);
      margin: 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .files-header .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--pf-status-running);
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    ul.files {
      list-style: none;
      padding: 0;
      margin: 0 0 8px;
    }
    li.file {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 6px;
      cursor: pointer;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 11px;
    }
    li.file:hover {
      background: var(--pf-bg-elevated);
    }
    li.file .icon {
      font-family: codicon;
      font-size: 12px;
      color: var(--pf-text-muted);
      flex-shrink: 0;
    }
    li.file .path {
      color: var(--pf-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      gap: 6px;
    }
    .action {
      padding: 3px 10px;
      background: transparent;
      color: var(--pf-text);
      border: 1px solid var(--pf-border);
      border-radius: 3px;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
    }
    .action:hover {
      background: var(--pf-bg-elevated);
    }
  `;

  protected override updated(changed: Map<string, unknown>): void {
    if (changed.has('transcriptText')) {
      const pre = this.shadowRoot?.querySelector<HTMLPreElement>('pre.transcript');
      if (!pre) return;
      if (this.wasAtBottom) {
        pre.scrollTop = pre.scrollHeight;
      }
    }
  }

  private handleScroll = (event: Event): void => {
    const pre = event.target as HTMLPreElement;
    const distanceFromBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight;
    this.wasAtBottom = distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX;
  };

  private handleFileClick(filePath: string): void {
    const runId = this.run?.runId;
    if (!runId) return;
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-diff', {
        detail: { runId, filePath },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handlePromptClick = (): void => {
    const runId = this.run?.runId;
    if (!runId) return;
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-prompt', {
        detail: { runId },
        bubbles: true,
        composed: true,
      }),
    );
  };

  override render() {
    const summary = this.run?.summary;
    const intent = summary?.userIntent?.trim();
    const fallbackId = this.run?.annotationId ?? this.run?.runId ?? '';
    const intentText = intent || fallbackId || '—';
    const source = summary?.sourceLocation;
    const sourceLine = source?.file
      ? `${basename(source.file)}${source.line !== undefined ? `:${source.line}` : ''}`
      : '';
    const provider = summary?.provider;
    const duration = formatDuration(summary?.startedAt, summary?.finishedAt);
    const errorDetails = (summary as { errorDetails?: string } | undefined)?.errorDetails;
    const promptPath = this.run?.promptPath;
    const fileCount = this.changedFiles.length;
    const metaText = [provider ? `via ${provider}` : '', duration].filter(Boolean).join(' · ');
    return html`<div class="root">
      <section class="request">
        <div class="intent">${intentText}</div>
        ${sourceLine ? html`<div class="source">${sourceLine}</div>` : null}
        ${metaText ? html`<div class="meta">${metaText}</div>` : null}
        ${errorDetails
          ? html`<div class="meta" style="color: var(--pf-status-failed);">${errorDetails}</div>`
          : null}
      </section>
      <pre class="transcript" @scroll=${this.handleScroll}>${this.transcriptText}</pre>
      ${fileCount > 0
        ? html`<section class="files-section">
            <div class="files-header">
              ${this.isLive ? html`<span class="live-dot" aria-hidden="true"></span>` : null}
              <span>Changed files (${fileCount})</span>
            </div>
            <ul class="files">
              ${repeat(
                this.changedFiles,
                (f) => f.path,
                (f) => html`
                  <li class="file" @click=${() => this.handleFileClick(f.path)}>
                    <i class="codicon codicon-diff icon" aria-hidden="true"></i>
                    <span class="path">${f.path}</span>
                  </li>
                `,
              )}
            </ul>
          </section>`
        : null}
      ${promptPath
        ? html`<div class="actions">
            <button class="action" @click=${this.handlePromptClick} type="button">
              Open prompt
            </button>
          </div>`
        : null}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-run-detail': PinflowRunDetail;
  }
}
