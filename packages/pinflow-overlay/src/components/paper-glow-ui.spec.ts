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
  setHoveredElement: vi.fn(),
  exitCaptureMode: vi.fn(),
  selectElement: vi.fn().mockResolvedValue(undefined),
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
const disableCapture = vi.fn();

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
      disableCapture,
    }),
  },
}));

import './ds-header.js';
import './ds-sidebar.js';
import './ds-annotation-input.js';
import './ds-element-preview.js';
import './ds-picker-overlay.js';
import './ds-tab.js';
import './ds-session-settings.js';
import './ds-workflow-panel.js';
import './ds-annotation-list.js';

async function openSettingsOverlay(sidebar: HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
}) {
  const header = sidebar.shadowRoot.querySelector('ds-header') as HTMLElement & {
    shadowRoot: ShadowRoot;
    updateComplete: Promise<unknown>;
  };
  await header.updateComplete;

  const settingsButton = header.shadowRoot.querySelector(
    'button[aria-label="Einstellungen oeffnen"]',
  ) as HTMLButtonElement;
  settingsButton.click();
  await sidebar.updateComplete;

  const settingsOverlay = sidebar.shadowRoot.querySelector(
    'ds-settings-overlay',
  ) as HTMLElement & {
    shadowRoot: ShadowRoot;
    updateComplete: Promise<unknown>;
  };

  await settingsOverlay.updateComplete;
  return settingsOverlay;
}

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
    ) as HTMLElement | null;
    const settingsButton = header.shadowRoot.querySelector(
      'button[aria-label="Einstellungen oeffnen"]',
    ) as HTMLButtonElement | null;
    const closeButton = header.shadowRoot.querySelector(
      'button[aria-label="Seitenleiste schliessen"]',
    );

    expect(brandWordmark).not.toBeNull();
    expect(brandWordmark?.textContent).toBe('PinFlow');
    expect(header.shadowRoot.textContent).toContain('Arbeitsbereich');
    expect(header.shadowRoot.textContent).toContain('Session aktiv');
    expect(header.shadowRoot.textContent).not.toContain('Auswahl, Kommentare');
    expect(header.scrolled).toBe(false);
    expect(settingsButton).not.toBeNull();
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
    const agentButton = input.shadowRoot.querySelector(
      'button[aria-label="Agent waehlen"]',
    ) as HTMLButtonElement;
    const settingsButton = input.shadowRoot.querySelector(
      'button[aria-label="Einstellungen oeffnen"]',
    ) as HTMLButtonElement;
    const submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(textarea?.getAttribute('placeholder')).toBe(
      'Relay verbinden ...',
    );
    expect(input.shadowRoot.textContent).not.toContain('Kommentar und Auftrag');
    expect(input.shadowRoot.textContent).not.toContain('Auswahl Kein Element');
    expect(input.shadowRoot.textContent).not.toContain('Flow Codex');
    expect(input.shadowRoot.textContent).not.toContain('Strg+Enter');
    expect(agentButton).not.toBeNull();
    expect(settingsButton).not.toBeNull();
    expect(submitButton).not.toBeNull();
    captureButton.click();
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
    expect(inputText).toContain('Relay verbinden, dann senden.');
    expect(submitButton.disabled).toBe(true);

    mockState.relayConnected = true;
    input.requestUpdate();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Element waehlen');
    expect(inputText).toContain('Element waehlen und Aenderung schreiben.');
    expect(submitButton.disabled).toBe(true);

    mockState.mode = 'capturing';
    input.requestUpdate();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;

    expect(inputText).toContain('Picker aktiv');
    expect(inputText).toContain('Im Canvas ein Element markieren.');
    expect(submitButton.disabled).toBe(true);

    mockState.mode = 'expanded';
    mockState.selectedElement = document.createElement('button');
    input.requestUpdate();
    await input.updateComplete;

    inputText = input.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(inputText).toContain('Element markiert');
    expect(inputText).toContain('Aenderung fuer das markierte Element schreiben.');

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

    expect(inputText).toContain('Bereit');
    expect(inputText).toContain('Kurz pruefen und senden.');
    expect(submitButton.disabled).toBe(false);
  });

  it('renders a visible picker highlight and selection flow', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const target = document.createElement('button');
    target.setAttribute('data-ds', 'entry-42');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 20,
          left: 30,
          width: 120,
          height: 42,
        }) as DOMRect,
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => target),
    });

    render(html`<ds-picker-overlay></ds-picker-overlay>`, host);

    const picker = host.querySelector('ds-picker-overlay') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await picker.updateComplete;

    const pickerText = picker.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(pickerText).toContain('Picker aktiv');
    expect(pickerText).toContain('Markiere jetzt dein Zielelement');
    expect(pickerText).toContain('Der helle Rahmen zeigt dir immer das aktuell getroffene Element.');
    expect(pickerText).toContain('ESC');
    expect(pickerText).toContain('bricht ab');

    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 40,
        clientY: 30,
      }),
    );
    await picker.updateComplete;

    expect(mockStore.setHoveredElement).toHaveBeenCalledWith(target);
    expect(picker.shadowRoot.querySelector('ds-highlight-box')).not.toBeNull();

    window.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 40,
        clientY: 30,
      }),
    );
    expect(mockStore.selectElement).toHaveBeenCalledWith(target);
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
    expect(inputText).toContain('Auftrag uebergeben. Direkt weiterschreiben.');
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

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
    expect(inputText).toContain('Senden fehlgeschlagen. Direkt erneut versuchen.');
    submitButton = input.shadowRoot.querySelector(
      'button[aria-label="Anmerkung senden"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
  });

  it('renders the collapsed launcher with a visible PinFlow mark', async () => {
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

    const brandMark = tab.shadowRoot.querySelector('.tab-mark svg');
    expect(brandMark).not.toBeNull();
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

    const sidebarText = sidebar.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    const workspaceTop = sidebar.shadowRoot.querySelector(
      '.workspace-top',
    ) as HTMLElement | null;
    const composerDock = sidebar.shadowRoot.querySelector(
      '.composer-dock',
    ) as HTMLElement | null;
    const elementPreview = sidebar.shadowRoot.querySelector(
      'ds-element-preview',
    ) as HTMLElement | null;
    const input = sidebar.shadowRoot.querySelector(
      'ds-annotation-input',
    ) as HTMLElement | null;
    const drawers = Array.from(
      sidebar.shadowRoot.querySelectorAll('.context-drawer'),
    ) as HTMLElement[];

    expect(workspaceTop).not.toBeNull();
    expect(composerDock).not.toBeNull();
    expect(elementPreview).not.toBeNull();
    expect(input).not.toBeNull();
    expect(drawers).toHaveLength(1);
    expect(sidebarText).toContain('Auswahl');
    expect(sidebarText).not.toContain('Verlauf');
    expect(sidebarText).not.toContain('Arbeitsfluss');
    expect(sidebarText).toContain('Kommentar und Auftrag');
    expect(
      Boolean(
        workspaceTop.compareDocumentPosition(composerDock) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(workspaceTop?.contains(elementPreview)).toBe(true);
    expect(input.parentElement).toBe(composerDock);

    const settingsOverlay = await openSettingsOverlay(sidebar);
    const overlayText =
      settingsOverlay.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(overlayText).toContain('Arbeitsbereich anpassen');
    expect(settingsOverlay.shadowRoot.querySelector('ds-workflow-panel')).not.toBeNull();
    expect(settingsOverlay.shadowRoot.querySelector('ds-annotation-list')).not.toBeNull();
  });

  it('opens workspace settings as a dedicated full-surface overlay', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-sidebar></ds-sidebar>`, host);

    const sidebar = host.querySelector('ds-sidebar') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await sidebar.updateComplete;

    const settingsOverlay = await openSettingsOverlay(sidebar);

    const overlayText =
      settingsOverlay.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(overlayText).toContain('Einstellungen');
    expect(overlayText).toContain('Arbeitsbereich anpassen');
    expect(
      settingsOverlay.shadowRoot.querySelectorAll('.tab-btn'),
    ).toHaveLength(3);

    const embeddedSettings = settingsOverlay.shadowRoot.querySelector(
      'ds-session-settings',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await embeddedSettings.updateComplete;
    const settingsText =
      embeddedSettings.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(settingsText).toContain('Projektstandard');
    expect(settingsText).toContain('Session-Verhalten');

    const closeButton = settingsOverlay.shadowRoot.querySelector(
      'button[aria-label="Einstellungen schliessen"]',
    ) as HTMLButtonElement;
    closeButton.click();
    await sidebar.updateComplete;

    expect(sidebar.shadowRoot.querySelector('ds-settings-overlay')).toBeNull();
  });

  it('renders annotation items with guided lifecycle language', async () => {
    const annotation = {
      metadata: {
        id: 'note-7',
        status: 'processing',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      context: {
        userMessage: 'CTA klarer formulieren',
      },
      interaction: {
        selectedElement: {
          tagName: 'button',
        },
      },
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-annotation-item .annotation=${annotation}></ds-annotation-item>`, host);

    const item = host.querySelector('ds-annotation-item') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await item.updateComplete;

    let itemText = item.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(itemText).toContain('In Bearbeitung');

    const collapsedRow = item.shadowRoot.querySelector('.collapsed-row') as HTMLElement;
    collapsedRow.click();
    await item.updateComplete;

    itemText = item.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(itemText).toContain('In Bearbeitung');
    expect(itemText).toContain('PinFlow arbeitet gerade an dieser Aenderung.');
    expect(itemText).toContain('vor');
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
    expect(settingsText).toContain('Wirkt gerade');
    expect(settingsText).toContain('Projektstandard aktiv');
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
    expect(settingsText).toContain('Session-Regeln aktiv');
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
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector('ds-workflow-panel') as HTMLElement & {
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
    expect(workflowText).toContain('Naechster Schritt');
    expect(workflowText).toContain(
      'Fehler pruefen und verbleibende Aufgaben erneut anstossen.',
    );
    expect(workflowText).toContain('Nacharbeit im Blick');
    expect(workflowText).toContain(
      '1 Aufgabe aus den letzten 1 Batch braucht Nacharbeit oder erneuten Versand.',
    );
    expect(workflowText).toContain('Claude');
  });

  it('renders batch history notes for failed and completed runs', async () => {
    mockState.annotations = [
      { id: 'note-1', metadata: { status: 'failed' } },
      { id: 'note-2', metadata: { status: 'processed' } },
    ];
    mockState.dispatchBatches = [
      {
        id: 'batch-failed',
        channel: 'codex',
        annotationIds: ['note-1'],
        releasedAt: '2026-04-23T14:10:00.000Z',
        status: 'failed',
        queuedCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 1,
      },
      {
        id: 'batch-completed',
        channel: 'claude',
        annotationIds: ['note-2'],
        releasedAt: '2026-04-23T13:20:00.000Z',
        status: 'completed',
        queuedCount: 0,
        processingCount: 0,
        completedCount: 1,
        failedCount: 0,
      },
    ];

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector('ds-workflow-panel') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await workflowPanel.updateComplete;

    const workflowText =
      workflowPanel.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(workflowText).toContain(
      'Batch nicht erfolgreich. Fehler pruefen und bewusst erneut starten.',
    );
    expect(workflowText).toContain('Ohne offene Nacharbeit abgeschlossen.');
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
      'Markiere ein Element, damit PinFlow Quelle und Kontext direkt verknuepfen kann.',
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
    render(html`<ds-annotation-list></ds-annotation-list>`, host);

    const list = host.querySelector('ds-annotation-list') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };

    await list.updateComplete;
    const listText = list.shadowRoot.textContent?.replace(/\s+/g, ' ') ?? '';
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
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector('ds-workflow-panel') as HTMLElement & {
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
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector('ds-workflow-panel') as HTMLElement & {
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
    render(html`<ds-workflow-panel></ds-workflow-panel>`, host);

    const workflowPanel = host.querySelector('ds-workflow-panel') as HTMLElement & {
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
