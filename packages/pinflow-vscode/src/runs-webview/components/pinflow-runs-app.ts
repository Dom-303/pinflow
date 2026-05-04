import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './pinflow-runs-header.js';
import './pinflow-empty-state.js';
import './pinflow-run-card.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

@customElement('pinflow-runs-app')
export class PinflowRunsApp extends LitElement {
  @property({ attribute: false }) runs: readonly PinFlowRunEvidence[] = [];
  @property({ attribute: false }) settings: RunsWebviewSettings = { timeFormat: '24h' };

  static styles = css`
    :host {
      display: block;
      padding: 0 0 16px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 8px;
    }
  `;

  render() {
    if (this.runs.length === 0) {
      return html`<pinflow-empty-state></pinflow-empty-state>`;
    }
    return html`
      <pinflow-runs-header .count=${this.runs.length}></pinflow-runs-header>
      <div class="list">
        ${repeat(
          this.runs,
          (run) => run.runId ?? run.summaryPath,
          (run, index) => html`
            <pinflow-run-card
              .run=${run}
              .timeFormat=${this.settings.timeFormat}
              .index=${index}
            ></pinflow-run-card>
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
