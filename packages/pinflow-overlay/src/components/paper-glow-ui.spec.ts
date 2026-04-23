/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html, render } from 'lit';

const mockStore = {
  setMode: vi.fn(),
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
  setDispatchSessionOverrides: vi.fn(),
  updateDispatchProjectDefaults: vi.fn(),
  clearDispatchSessionOverrides: vi.fn(),
  toggleDispatchPaused: vi.fn(),
  releaseNextDispatchBatch: vi.fn(),
  enterCaptureMode: vi.fn(),
  submitAnnotation: vi.fn().mockResolvedValue(undefined),
};

const mockState = {
  selectedElement: null as null | { tagName: string },
  annotations: [] as Array<{ id: string; metadata?: { status?: string } }>,
  dispatchBatches: [] as Array<{
    id: string;
    channel: string;
    annotationIds: string[];
    status: string;
    queuedCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
  }>,
  relayConnected: false,
  mode: 'expanded',
  theme: 'light' as const,
  tabOffsetY: 50,
  dispatchProjectDefaults: {
    channel: 'codex' as const,
    mode: 'manual' as const,
    threshold: 3,
    concurrency: 3,
    continuation: 'automatic' as const,
  },
  dispatchSession: {
    overrides: {},
    paused: false,
    releasedAnnotationIds: [],
    awaitingConfirmationIds: [],
    flowActive: false,
  },
};

const enableCapture = vi.fn();

vi.mock('../core/store-controller.js', () => ({
  StoreController: class {
    store = mockStore;
    state = mockState;
  },
}));

vi.mock('../core/event-manager.js', () => ({
  EventManager: {
    getInstance: () => ({
      enableCapture,
    }),
  },
}));

import './ds-header.js';
import './ds-sidebar.js';
import './ds-annotation-input.js';
import './ds-tab.js';
import './ds-session-settings.js';

describe('Paper Glow UI contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockState.selectedElement = null;
    mockState.annotations = [];
    mockState.dispatchBatches = [];
    mockState.relayConnected = false;
    mockState.mode = 'expanded';
    mockState.theme = 'light';
    mockState.dispatchProjectDefaults = {
      channel: 'codex',
      mode: 'manual',
      threshold: 3,
      concurrency: 3,
      continuation: 'automatic',
    };
    mockState.dispatchSession = {
      overrides: {},
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
    };
    vi.clearAllMocks();
  });

  it('renders PinFlow branding in the header', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-header></ds-header>`, host);

    const header = host.querySelector('ds-header') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await header.updateComplete;

    const brandWordmark = header.shadowRoot.querySelector(
      '.brand-wordmark',
    ) as HTMLImageElement | null;
    const closeButton = header.shadowRoot.querySelector(
      'button[aria-label="Seitenleiste schliessen"]',
    );

    expect(brandWordmark).not.toBeNull();
    expect(brandWordmark?.getAttribute('alt')).toBe('PinFlow');
    expect(brandWordmark?.getAttribute('src')).toContain('pinflow-horizontal');
    expect(header.shadowRoot.textContent).toContain('Arbeitsbereich');
    expect(header.shadowRoot.textContent).toContain('Session live');
    expect(header.shadowRoot.textContent).toContain(
      'Auswahl, Kommentare und Versand im aktuellen Flow',
    );
    expect(header.scrolled).toBe(false);
    expect(closeButton).not.toBeNull();
    expect(closeButton?.querySelector('svg path')).not.toBeNull();
  });

  it('renders German-first annotation input copy', async () => {
    expect(customElements.get('ds-annotation-input')).toBeDefined();

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await input.updateComplete;

    const textarea = input.shadowRoot.querySelector('textarea');
    const captureButton = input.shadowRoot.querySelector(
      'button[aria-label="Element markieren"]',
    ) as HTMLButtonElement;

    expect(textarea?.getAttribute('placeholder')).toBe(
      'Verbinde mit Relay...',
    );
    captureButton.click();
    expect(enableCapture).toHaveBeenCalledTimes(1);
    expect(mockStore.enterCaptureMode).toHaveBeenCalledTimes(1);
  });

  it('renders the collapsed launcher with theme-aware PinFlow assets', async () => {
    mockState.mode = 'collapsed';
    mockState.theme = 'dark';

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-tab></ds-tab>`, host);

    const tab = host.querySelector('ds-tab') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await tab.updateComplete;

    const brandImage = tab.shadowRoot.querySelector(
      '.tab-mark img',
    ) as HTMLImageElement | null;
    expect(brandImage).not.toBeNull();
    expect(brandImage?.getAttribute('alt')).toBe('PinFlow');
    expect(brandImage?.getAttribute('src')).toContain('pinflow-icon-dark');
  });

  it('renders the sidebar shell from deterministic store state', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { status: 'queued' } },
      { id: 'note-2', metadata: { status: 'processed' } },
    ];
    mockState.dispatchBatches = [
      {
        id: 'batch-1',
        channel: 'codex',
        annotationIds: ['note-1', 'note-2'],
        status: 'running',
        queuedCount: 1,
        processingCount: 1,
        completedCount: 0,
        failedCount: 0,
      },
    ];
    mockState.relayConnected = true;

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-sidebar></ds-sidebar>`, host);

    const sidebar = host.querySelector('ds-sidebar') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await sidebar.updateComplete;

    const workflowPanel = sidebar.shadowRoot.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    const annotationList = sidebar.shadowRoot.querySelector(
      'ds-annotation-list',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    const sidebarText = sidebar.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    await workflowPanel.updateComplete;
    await annotationList.updateComplete;
    const listText =
      annotationList.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(sidebarText).toContain('Arbeitsverlauf');
    expect(sidebarText).toContain('Anmerkungen (2)');
    expect(listText).toContain('Bereit');
    expect(listText).toContain('Erledigt');
    expect(sidebarText).toContain(
      'Verlauf, Antworten und Status in der aktuellen Session',
    );
    expect(sidebarText).toContain('Naechster Schritt');
    expect(sidebarText).toContain('Aenderung formulieren');
    expect(sidebarText).toContain(
      'Markiere ein Element, beschreibe die Aenderung und uebergib sie direkt an deinen Flow.',
    );
    expect(sidebarText).toContain('Verbunden');
    expect(sidebarText).toContain('Arbeitsmodus');
    expect(sidebarText).toContain('Schnellzugriff');
    expect(sidebar.shadowRoot.querySelector('.status-dot.connected')).not.toBeNull();
    expect(sidebar.shadowRoot.querySelector('ds-annotation-input')).not.toBeNull();
    expect(workflowPanel.shadowRoot.textContent).toContain('Flow-Steuerung');
    expect(workflowPanel.shadowRoot.textContent).toContain(
      'Session-Kanal',
    );
    expect(workflowPanel.shadowRoot.textContent).toContain(
      'Queue-Status',
    );
    expect(workflowPanel.shadowRoot.textContent).toContain('Freigabe & Automatik');
    expect(workflowPanel.shadowRoot.textContent).toContain('Codex');
    expect(workflowPanel.shadowRoot.textContent).toContain('Letzte Batches');
    expect(workflowPanel.shadowRoot.textContent).toContain('Laeuft');

    const darkToggle = sidebar.shadowRoot.querySelector(
      'button[aria-label="Dunkelmodus aktivieren"]',
    ) as HTMLButtonElement;
    darkToggle.click();
    expect(mockStore.setTheme).toHaveBeenCalledWith('dark');

    const claudeButton = workflowPanel.shadowRoot.querySelector(
      'button[aria-label="Kanal Claude fuer diese Session aktivieren"]',
    ) as HTMLButtonElement;
    claudeButton.click();
    expect(mockStore.setDispatchSessionOverrides).toHaveBeenCalledWith({
      channel: 'claude',
    });

    const releaseButton = workflowPanel.shadowRoot.querySelector(
      '.dispatch-btn',
    ) as HTMLButtonElement;
    expect(releaseButton.textContent).toContain('Naechsten Batch senden');
    releaseButton.click();
    expect(mockStore.releaseNextDispatchBatch).toHaveBeenCalledTimes(1);
  });

  it('renders session settings with project defaults and an empty override state', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-session-settings
        .projectDefaults=${mockState.dispatchProjectDefaults}
        .sessionOverrides=${{}}
      ></ds-session-settings>`,
      host,
    );

    const settings = host.querySelector(
      'ds-session-settings',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await settings.updateComplete;

    const settingsText =
      settings.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(settingsText).toContain('Projektstandard');
    expect(settingsText).toContain('Session-Verhalten');
    expect(settingsText).toContain('Session folgt Projektstandard');
    expect(settingsText).toContain('Parallelitaet');
    expect(settingsText).toContain('Automatik-Schwelle');
  });

  it('renders calm empty states in dark mode when no session items exist', async () => {
    mockState.annotations = [];
    mockState.dispatchBatches = [];
    mockState.relayConnected = false;
    mockState.theme = 'dark';

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-sidebar></ds-sidebar>`, host);

    const sidebar = host.querySelector('ds-sidebar') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await sidebar.updateComplete;

    const list = sidebar.shadowRoot.querySelector(
      'ds-annotation-list',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    const workflowPanel = sidebar.shadowRoot.querySelector(
      'ds-workflow-panel',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;
    await list.updateComplete;

    const sidebarText = sidebar.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const listText = list.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(sidebarText).toContain('Nicht verbunden');
    expect(workflowText).toContain('Flow-Steuerung');
    expect(workflowText).toContain('Bereit zum Start');
    expect(workflowText).toContain('Bereit fuer den ersten Batch');
    expect(listText).toContain('Noch keine Anmerkungen in dieser Session');
    expect(listText).toContain(
      'Markiere ein Element und starte rechts mit deiner ersten Aenderung.',
    );
  });
});
