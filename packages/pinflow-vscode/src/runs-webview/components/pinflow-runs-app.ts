import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './pinflow-runs-header.js';
import './pinflow-empty-state.js';
import './pinflow-folder-section.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';
import type { RunsWebviewSettings } from '../../core/views/runs-webview-messages.js';

// node:path is not available in the browser; the webview only needs basename.
function basename(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(idx + 1) : p;
}

@customElement('pinflow-runs-app')
export class PinflowRunsApp extends LitElement {
  @property({ attribute: false }) runsByFolder: Readonly<Record<string, readonly PinFlowRunEvidence[]>> = {};
  @property({ attribute: false }) activeFolder?: string;
  @property({ attribute: false }) settings: RunsWebviewSettings = { timeFormat: '24h' };

  static styles = css`
    :host {
      display: block;
      padding: 0 0 16px;
    }
  `;

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
              .timeFormat=${this.settings.timeFormat}
              .defaultExpanded=${folder === this.activeFolder}
              .isActive=${folder === this.activeFolder}
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
