/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html, render } from 'lit';

const mockStore = {
  setMode: vi.fn(),
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
  clearSelection: vi.fn(),
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
    releasedAt: string;
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
  runtimeContext: null as null | {
    componentProps?: Record<string, unknown>;
    componentState?: Record<string, unknown>;
  },
  manifestEntry: null as
    | null
    | {
        id: string;
        file: string;
        start: { line: number | null; column: number | null };
      },
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
import './ds-element-preview.js';
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
    mockState.runtimeContext = null;
    mockState.manifestEntry = null;
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

  it('renders guided composer states for offline, selection and ready-to-send moments', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await input.updateComplete;

    let inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    let submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Relay offline');
    expect(inputText).toContain(
      'Verbinde PinFlow zuerst mit dem Relay, damit neue Aufgaben direkt in deinen Flow gehen koennen.',
    );
    expect(submitButton.textContent).toContain('Wartet auf Relay');
    expect(submitButton.disabled).toBe(true);

    mockState.relayConnected = true;
    input.requestUpdate();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Element waehlen');
    expect(inputText).toContain(
      'Markiere zuerst rechts ein UI-Element und formuliere danach die gewuenschte Aenderung.',
    );
    expect(submitButton.textContent).toContain('Element waehlen');
    expect(submitButton.disabled).toBe(true);

    mockState.selectedElement = document.createElement('button');
    input.requestUpdate();
    await input.updateComplete;

    const textarea = input.shadowRoot.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    textarea.value = 'CTA klarer formulieren';
    textarea.dispatchEvent(new Event('input'));
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Bereit zum Senden');
    expect(inputText).toContain(
      'Die Aenderung geht direkt in den aktiven Flow. Mit Strg+Enter kannst du sofort senden.',
    );
    expect(submitButton.textContent).toContain('In Flow geben');
    expect(submitButton.disabled).toBe(false);
  });

  it('renders composer feedback after submit success and failure', async () => {
    mockState.relayConnected = true;
    mockState.selectedElement = document.createElement('button');

    const host = document.createElement('div');
    document.body.appendChild(host);

    render(html`<ds-annotation-input></ds-annotation-input>`, host);

    const input = host.querySelector('ds-annotation-input') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await input.updateComplete;

    const textarea = input.shadowRoot.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    let submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    textarea.value = 'Headline praeziser machen';
    textarea.dispatchEvent(new Event('input'));
    await input.updateComplete;

    submitButton.click();
    await Promise.resolve();
    await input.updateComplete;

    let inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(inputText).toContain('Im Flow');
    expect(inputText).toContain(
      'Dein Auftrag wurde uebergeben und taucht jetzt im Arbeitsverlauf auf.',
    );
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    expect(submitButton.textContent).toContain('Uebergeben');

    mockStore.submitAnnotation.mockRejectedValueOnce(new Error('boom'));
    textarea.value = 'CTA nachschaerfen';
    textarea.dispatchEvent(new Event('input'));
    await input.updateComplete;

    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    submitButton.click();
    await Promise.resolve();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(inputText).toContain('Senden fehlgeschlagen');
    expect(inputText).toContain(
      'Der Auftrag konnte gerade nicht uebergeben werden. Pruefe Relay und versuche es erneut.',
    );
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    expect(submitButton.textContent).toContain('Erneut versuchen');
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
        releasedAt: '2026-04-23T09:30:00.000Z',
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
    expect(workflowPanel.shadowRoot.textContent).toContain('Fortsetzung');
    expect(workflowPanel.shadowRoot.textContent).toContain('Automatisch');
    expect(workflowPanel.shadowRoot.textContent).toContain('Freigabe & Automatik');
    expect(workflowPanel.shadowRoot.textContent).toContain('Codex');
    expect(workflowPanel.shadowRoot.textContent).toContain('Letzter Lauf');
    expect(workflowPanel.shadowRoot.textContent).toContain('Letzte Batches');
    expect(workflowPanel.shadowRoot.textContent).toContain('Laeuft');
    expect(workflowPanel.shadowRoot.textContent).toContain('Freigegeben');
    expect(workflowPanel.shadowRoot.textContent).toContain('23.04., 09:30');

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
    expect(settingsText).toContain('Keine Session-Anpassungen aktiv');
    expect(settingsText).toContain('Parallelitaet');
    expect(settingsText).toContain('Automatik-Schwelle');
  });

  it('renders active session adjustments as a compact summary', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-session-settings
        .projectDefaults=${mockState.dispatchProjectDefaults}
        .sessionOverrides=${{
          channel: 'claude',
          mode: 'threshold',
          continuation: 'confirm',
        }}
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
    expect(settingsText).toContain('Aktive Session-Anpassungen');
    expect(settingsText).toContain('Claude');
    expect(settingsText).toContain('Ab Schwelle');
    expect(settingsText).toContain('Freigeben');
    expect(settingsText).toContain('Session-Overrides zuruecksetzen');
  });

  it('renders mixed batch outcomes as a guided partial-success state', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { status: 'processed' } },
      { id: 'note-2', metadata: { status: 'failed' } },
    ];
    mockState.dispatchBatches = [
      {
        id: 'batch-mixed',
        channel: 'claude',
        annotationIds: ['note-1', 'note-2'],
        releasedAt: '2026-04-23T13:45:00.000Z',
        status: 'mixed',
        queuedCount: 0,
        processingCount: 0,
        completedCount: 1,
        failedCount: 1,
      },
    ];

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

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(workflowText).toContain('Teilerfolg');
    expect(workflowText).toContain(
      'Ein Teil des letzten Laufs ist fertig, einzelne Aufgaben brauchen noch Nacharbeit.',
    );
    expect(workflowText).toContain('1 Fehler');
    expect(workflowText).toContain('Claude');
  });

  it('renders a guided inspector state for empty and selected elements', async () => {
    mockState.theme = 'dark';

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-element-preview></ds-element-preview>`, host);

    const preview = host.querySelector('ds-element-preview') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await preview.updateComplete;

    let previewText = preview.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(previewText).toContain('Noch kein Element ausgewaehlt');
    expect(previewText).toContain('Elementaufnahme bereit');
    expect(previewText).toContain(
      'Markiere rechts ein Element, um Quelle, Eigenschaften und Status zu sehen.',
    );
    expect(previewText).toContain(
      'Sobald du ein Element markierst, siehst du hier sofort Quelle, Kontext und naechsten Schritt.',
    );

    mockState.selectedElement = document.createElement('button');
    mockState.runtimeContext = {
      componentProps: { variant: 'primary', disabled: false },
      componentState: { busy: true },
    };
    mockState.manifestEntry = {
      id: 'entry1234',
      file: 'src/components/PrimaryButton.tsx',
      start: { line: 42, column: 3 },
    };

    preview.requestUpdate();
    await preview.updateComplete;

    previewText = preview.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(previewText).toContain('Auswahl');
    expect(previewText).toContain('Auswahl bestaetigt');
    expect(previewText).toContain('<button>');
    expect(previewText).toContain('Quelle');
    expect(previewText).toContain('PrimaryButton.tsx:42');
    expect(previewText).toContain('2 Eigenschaften');
    expect(previewText).toContain('1 Statusfeld');
    expect(previewText).toContain('Quelle verknuepft');

    const dismissButton = preview.shadowRoot.querySelector(
      'button[aria-label="Elementauswahl aufheben"]',
    ) as HTMLButtonElement;
    dismissButton.click();
    expect(mockStore.clearSelection).toHaveBeenCalledTimes(1);
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

  it('renders safe collecting states for queue-only and paused sessions', async () => {
    mockState.annotations = [{ id: 'note-queue', metadata: { status: 'queued' } }];
    mockState.dispatchProjectDefaults = {
      channel: 'queue_only',
      mode: 'manual',
      threshold: 3,
      concurrency: 3,
      continuation: 'automatic',
    };
    mockState.dispatchSession = {
      overrides: { channel: 'queue_only' },
      paused: true,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
    };

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

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const releaseButton = workflowPanel.shadowRoot.querySelector(
      '.dispatch-btn',
    ) as HTMLButtonElement;

    expect(workflowText).toContain('Sammelt Aufgaben ohne Versand');
    expect(workflowText).toContain(
      'Neue Aufgaben bleiben gesammelt, bis du einen aktiven Kanal waehlst.',
    );
    expect(workflowText).toContain('Queue pausiert');
    expect(workflowText).toContain('Sammelt weiter');
    expect(workflowText).toContain(
      'Wechsle auf Codex oder Claude, sobald die ersten Aufgaben rausgehen sollen.',
    );
    expect(releaseButton.disabled).toBe(true);
  });

  it('renders threshold guidance before automatic confirmation starts', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { id: 'note-1', status: 'queued' } },
      { id: 'note-2', metadata: { id: 'note-2', status: 'queued' } },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'codex',
      mode: 'threshold',
      threshold: 3,
      concurrency: 2,
      continuation: 'confirm',
    };
    mockState.dispatchSession = {
      overrides: { mode: 'threshold', continuation: 'confirm' },
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: [],
      flowActive: false,
    };

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

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(workflowText).toContain('Schwelle fast erreicht');
    expect(workflowText).toContain(
      'Noch 1 Aufgabe, dann stellt PinFlow den ersten Batch zur Freigabe bereit.',
    );
    expect(workflowText).toContain('Bereit fuer den naechsten Versand');
  });

  it('renders guided confirmation flow states when a batch awaits approval', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { id: 'note-1', status: 'queued' } },
      { id: 'note-2', metadata: { id: 'note-2', status: 'queued' } },
    ];
    mockState.dispatchProjectDefaults = {
      channel: 'codex',
      mode: 'threshold',
      threshold: 2,
      concurrency: 1,
      continuation: 'confirm',
    };
    mockState.dispatchSession = {
      overrides: { mode: 'threshold', continuation: 'confirm' },
      paused: false,
      releasedAnnotationIds: [],
      awaitingConfirmationIds: ['note-1'],
      flowActive: true,
    };

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

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    const releaseButton = workflowPanel.shadowRoot.querySelector(
      '.dispatch-btn',
    ) as HTMLButtonElement;

    expect(workflowText).toContain('Wartet auf Freigabe');
    expect(workflowText).toContain('Naechster Batch bereit');
    expect(workflowText).toContain(
      'Der naechste Batch liegt bereit. Pruefe ihn und gib ihn bewusst frei.',
    );
    expect(releaseButton.textContent).toContain('Batch freigeben (1)');
    expect(releaseButton.disabled).toBe(false);
  });
});
