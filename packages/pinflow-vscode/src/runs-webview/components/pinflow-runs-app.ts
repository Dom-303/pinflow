import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './pinflow-runs-header.js';
import './pinflow-empty-state.js';
import './pinflow-folder-section.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

// node:path is not available in the browser; the webview only needs basename.
function basename(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(idx + 1) : p;
}

@customElement('pinflow-runs-app')
export class PinflowRunsApp extends LitElement {
  @property({ attribute: false }) runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>> = {};
  @property({ attribute: false }) folderStatuses: Readonly<Record<string, 'configured' | 'not-configured'>> = {};
  @property({ attribute: false }) activeFolder?: string;
  @property({ attribute: false }) settings: RunsWebviewSettings = { timeFormat: '24h' };

  @state() private activeRunId: string | null = null;
  @state() private liveTranscript = '';
  @state() private liveChangedFiles: readonly PinFlowChangedFile[] | null = null;

  private static readonly ACTIVE_RUN_STORAGE_KEY = 'pinflow.runs.activeRunId';

  static styles = css`
    :host {
      display: block;
      padding: 0 0 16px;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    try {
      const stored = window.localStorage.getItem(PinflowRunsApp.ACTIVE_RUN_STORAGE_KEY);
      if (stored) this.activeRunId = stored;
    } catch {} // eslint-disable-line no-empty
    this.addEventListener('pinflow-card:click', this.handleCardClick as EventListener);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('pinflow-card:click', this.handleCardClick as EventListener);
    super.disconnectedCallback();
  }

  private handleCardClick = (event: CustomEvent<{ runId: string }>): void => {
    const clickedRunId = event.detail.runId;
    const previous = this.activeRunId;
    if (previous === clickedRunId) {
      this.activeRunId = null;
      this.liveTranscript = '';
      this.liveChangedFiles = null;
      this.persistActiveRunId(null);
      this.emitTransition({ type: 'collapse', runId: clickedRunId });
      return;
    }
    this.activeRunId = clickedRunId;
    this.liveTranscript = '';
    this.liveChangedFiles = null;
    this.persistActiveRunId(clickedRunId);
    if (previous) {
      this.emitTransition({ type: 'collapse', runId: previous });
    }
    this.emitTransition({ type: 'expand', runId: clickedRunId });
  };

  private persistActiveRunId(runId: string | null): void {
    try {
      if (runId) {
        window.localStorage.setItem(PinflowRunsApp.ACTIVE_RUN_STORAGE_KEY, runId);
      } else {
        window.localStorage.removeItem(PinflowRunsApp.ACTIVE_RUN_STORAGE_KEY);
      }
    } catch {} // eslint-disable-line no-empty
  }

  private emitTransition(detail: { type: 'expand' | 'collapse'; runId: string }): void {
    this.dispatchEvent(
      new CustomEvent('pinflow-runs:active-change', {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  applyTranscriptInitial(runId: string, text: string): void {
    if (this.activeRunId !== runId) return;
    this.liveTranscript = text;
  }

  applyTranscriptAppend(runId: string, delta: string): void {
    if (this.activeRunId !== runId) return;
    this.liveTranscript = this.liveTranscript + delta;
  }

  applyDiffUpdate(runId: string, files: readonly PinFlowChangedFile[]): void {
    if (this.activeRunId !== runId) return;
    this.liveChangedFiles = files;
  }

  render() {
    const folderPaths = Object.keys(this.runsByFolder);
    if (folderPaths.length === 0) {
      return html`<pinflow-empty-state></pinflow-empty-state>`;
    }
    const totalRuns = Object.values(this.runsByFolder).reduce(
      (sum, runs) => sum + runs.length,
      0,
    );
    return html`
      <pinflow-runs-header .count=${totalRuns}></pinflow-runs-header>
      <div class="sections">
        ${repeat(
          folderPaths,
          (folder) => folder,
          (folder) => html`
            <pinflow-folder-section
              .folderPath=${folder}
              .displayName=${basename(folder)}
              .runs=${this.runsByFolder[folder] ?? []}
              .folderStatus=${this.folderStatuses[folder] ?? 'configured'}
              .timeFormat=${this.settings.timeFormat}
              .defaultExpanded=${folder === this.activeFolder}
              .isActive=${folder === this.activeFolder}
              .activeRunId=${this.activeRunId}
              .liveTranscript=${this.liveTranscript}
              .liveChangedFiles=${this.liveChangedFiles}
            ></pinflow-folder-section>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-runs-app': PinflowRunsApp;
  }
}
