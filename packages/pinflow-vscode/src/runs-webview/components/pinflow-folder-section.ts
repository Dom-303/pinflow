import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './pinflow-run-card.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

@customElement('pinflow-folder-section')
export class PinflowFolderSection extends LitElement {
  @property({ attribute: false }) folderPath = '';
  @property({ attribute: false }) displayName = '';
  @property({ attribute: false }) runs: readonly PinFlowRunEvidence[] = [];
  @property({ attribute: false }) timeFormat: RunsWebviewSettings['timeFormat'] = '24h';
  @property({ attribute: false }) folderStatus: 'configured' | 'not-configured' = 'configured';
  @property({ type: Boolean }) defaultExpanded = false;
  @property({ type: Boolean }) isActive = false;
  @property({ attribute: false }) activeRunId: string | null = null;
  @property({ attribute: false }) liveTranscript = '';
  @property({ attribute: false }) liveChangedFiles: readonly PinFlowChangedFile[] | null = null;

  @state() private expanded = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.expanded = this.defaultExpanded;
  }

  static styles = css`
    :host {
      display: block;
      border-bottom: 1px solid var(--pf-border);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      user-select: none;
    }
    .header:hover {
      background: var(--pf-bg-elevated);
    }
    .chevron {
      font-family: codicon;
      font-size: 14px;
      color: var(--pf-text-muted);
      transition: transform 200ms ease;
    }
    :host([expanded]) .chevron {
      transform: rotate(90deg);
    }
    .name {
      flex: 1;
      color: var(--pf-text);
      font-weight: 500;
    }
    .active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--pf-accent);
    }
    .count {
      color: var(--pf-text-muted);
      font-size: 11px;
    }
    .body {
      padding: 2px 4px 8px;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    /* Wrapper around the conditional expanded body so happy-dom renders
       the children reliably; display:contents keeps it invisible to layout. */
    .content {
      display: contents;
    }
    .empty {
      padding: 16px 8px;
      text-align: center;
      color: var(--pf-text-muted);
      font-family: var(--vscode-font-family);
      font-size: 11px;
    }
    .setup-button {
      margin-top: 8px;
      padding: 4px 12px;
      background: var(--pf-accent);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 11px;
    }
    .setup-button:hover {
      filter: brightness(1.1);
    }
  `;

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('expanded')) {
      this.toggleAttribute('expanded', this.expanded);
    }
  }

  render() {
    return html`
      <div class="header" @click=${this.toggle}>
        <i class="codicon codicon-chevron-right chevron" aria-hidden="true"></i>
        <span class="name">${this.displayName}</span>
        ${this.isActive ? html`<span class="active-dot" aria-label="active folder"></span>` : null}
        <span class="count">${this.runs.length} run${this.runs.length === 1 ? '' : 's'}</span>
      </div>
      <div class="content">
        ${this.expanded
          ? this.folderStatus === 'not-configured'
            ? this.renderSetupBody()
            : this.runs.length > 0
              ? html`<div class="body">
                  ${repeat(
                    this.runs,
                    (run) => run.runId ?? run.summaryPath,
                    (run, index) => html`
                      <pinflow-run-card
                        .run=${run}
                        .timeFormat=${this.timeFormat}
                        .index=${index}
                        .isExpanded=${run.runId === this.activeRunId}
                        .liveTranscript=${run.runId === this.activeRunId ? this.liveTranscript : ''}
                        .liveChangedFiles=${run.runId === this.activeRunId ? this.liveChangedFiles : null}
                      ></pinflow-run-card>
                    `,
                  )}
                </div>`
              : html`<div class="empty">No runs yet for this folder.</div>`
          : null}
      </div>
    `;
  }

  private renderSetupBody() {
    return html`
      <div class="empty">
        <p>Run <code>pinflow init</code> to start tracking this folder.</p>
        <button class="setup-button" @click=${this.onSetupClick} type="button">
          Setup PinFlow
        </button>
      </div>
    `;
  }

  private onSetupClick = (event: Event): void => {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('setup-clicked', {
        detail: { folderPath: this.folderPath },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private toggle = (): void => {
    this.expanded = !this.expanded;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-folder-section': PinflowFolderSection;
  }
}
