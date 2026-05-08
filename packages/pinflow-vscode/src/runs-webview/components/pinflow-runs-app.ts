import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './pinflow-runs-header.js';
import './pinflow-empty-state.js';
import './pinflow-folder-section.js';
import './pinflow-compare-panel.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

const MAX_COMPARE_SELECTION = 2;

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
  @state() private compareMode = false;
  @state() private selectedRunIds: ReadonlySet<string> = new Set();

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
    this.addEventListener('pinflow-card:select', this.handleCardSelect as EventListener);
    this.addEventListener('pinflow-compare-mode-toggle', this.handleCompareModeToggle);
    this.addEventListener('pinflow-compare-clear', this.handleCompareClear);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('pinflow-card:click', this.handleCardClick as EventListener);
    this.removeEventListener('pinflow-card:select', this.handleCardSelect as EventListener);
    this.removeEventListener('pinflow-compare-mode-toggle', this.handleCompareModeToggle);
    this.removeEventListener('pinflow-compare-clear', this.handleCompareClear);
    super.disconnectedCallback();
  }

  private handleCompareModeToggle = (): void => {
    if (this.compareMode) {
      this.compareMode = false;
      this.selectedRunIds = new Set();
      return;
    }
    this.compareMode = true;
    this.selectedRunIds = new Set();
  };

  private handleCompareClear = (): void => {
    this.selectedRunIds = new Set();
  };

  private handleCardSelect = (event: CustomEvent<{ runId: string }>): void => {
    if (!this.compareMode) return;
    const runId = event.detail.runId;
    const next = new Set(this.selectedRunIds);
    if (next.has(runId)) {
      next.delete(runId);
    } else if (next.size < MAX_COMPARE_SELECTION) {
      next.add(runId);
    }
    this.selectedRunIds = next;
  };

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
    const [leftRun, rightRun] = this.resolveSelectedPair();
    const showComparePanel = this.compareMode && leftRun !== null && rightRun !== null;
    return html`
      <pinflow-runs-header
        .count=${totalRuns}
        .compareMode=${this.compareMode}
        .selectedCount=${this.selectedRunIds.size}
      ></pinflow-runs-header>
      <div class="compare-slot">
        ${showComparePanel
          ? html`<pinflow-compare-panel .left=${leftRun} .right=${rightRun}></pinflow-compare-panel>`
          : null}
      </div>
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
              .compareMode=${this.compareMode}
              .selectedRunIds=${this.selectedRunIds}
            ></pinflow-folder-section>
          `,
        )}
      </div>
    `;
  }

  private resolveSelectedPair(): [PinFlowRunEvidence | null, PinFlowRunEvidence | null] {
    if (this.selectedRunIds.size !== MAX_COMPARE_SELECTION) return [null, null];
    const lookup = new Map<string, PinFlowRunEvidence>();
    for (const runs of Object.values(this.runsByFolder)) {
      for (const run of runs) {
        if (run.runId) lookup.set(run.runId, run);
      }
    }
    const ids = Array.from(this.selectedRunIds);
    const left = lookup.get(ids[0]) ?? null;
    const right = lookup.get(ids[1]) ?? null;
    return [left, right];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pinflow-runs-app': PinflowRunsApp;
  }
}
