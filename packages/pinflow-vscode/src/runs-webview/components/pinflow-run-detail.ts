import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { PinFlowChangedFile } from '../../core/run-evidence.js';

const STICKY_BOTTOM_THRESHOLD_PX = 32;

@customElement('pinflow-run-detail')
export class PinflowRunDetail extends LitElement {
  @property({ attribute: false }) runId = '';
  @property({ attribute: false }) transcriptText = '';
  @property({ attribute: false }) changedFiles: readonly PinFlowChangedFile[] = [];
  @property({ attribute: false }) promptPath: string | null = null;
  @property({ type: Boolean }) isLive = false;

  private wasAtBottom = true;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--vscode-font-family);
      color: var(--pf-text);
      background: var(--vscode-editor-background);
    }
    .transcript {
      flex: 1 1 0;
      overflow-y: auto;
      margin: 0;
      padding: 10px 14px;
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
      background: var(--vscode-editor-background);
      color: var(--pf-text);
      border-bottom: 1px solid var(--pf-border);
    }
    .files-header {
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 600;
      color: var(--pf-text-muted);
      background: var(--pf-card-surface);
      border-bottom: 1px solid var(--pf-border);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .files {
      list-style: none;
      margin: 0;
      padding: 4px 0;
      overflow-y: auto;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--pf-border);
    }
    .file {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      font-size: 12px;
      color: var(--pf-text);
      cursor: pointer;
    }
    .file:hover {
      background: var(--pf-card-surface);
    }
    .path {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      gap: 8px;
      padding: 8px 14px;
      background: var(--pf-card-surface);
      flex-wrap: wrap;
    }
    .action {
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--pf-text);
      background: var(--vscode-editor-background);
      border: 1px solid var(--pf-border);
      border-radius: var(--pf-radius);
      padding: 4px 10px;
      cursor: pointer;
    }
    .action:hover {
      background: var(--pf-accent);
      color: var(--vscode-editor-background);
      border-color: var(--pf-accent);
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
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-diff', {
        detail: { runId: this.runId, filePath },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handlePromptClick = (): void => {
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-prompt', {
        detail: { runId: this.runId },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handleTranscriptClick = (): void => {
    this.dispatchEvent(
      new CustomEvent('pinflow-detail:open-transcript', {
        detail: { runId: this.runId },
        bubbles: true,
        composed: true,
      }),
    );
  };

  override render() {
    return html`
      <pre class="transcript" @scroll=${this.handleScroll}>${this.transcriptText}</pre>
      <div class="files-header">
        Changed files (${this.changedFiles.length})${this.isLive ? ' · live' : ''}
      </div>
      <ul class="files">
        ${repeat(
          this.changedFiles,
          (f) => f.path,
          (f) => html`
            <li class="file" @click=${() => this.handleFileClick(f.path)}>
              <i class="codicon codicon-diff" aria-hidden="true"></i>
              <span class="path">${f.path}</span>
            </li>
          `,
        )}
      </ul>
      <div class="actions">
        ${this.promptPath
          ? html`<button class="action" @click=${this.handlePromptClick} type="button">Open prompt</button>`
          : null}
        <button class="action" @click=${this.handleTranscriptClick} type="button">
          Open transcript in editor
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-run-detail': PinflowRunDetail;
  }
}
