import './pinflow-runs-app.js';
import { PinflowRunsApp } from './pinflow-runs-app.js';
import { PinflowFolderSection } from './pinflow-folder-section.js';

describe('<pinflow-runs-app>', () => {
  it('renders empty-state when runsByFolder is empty', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('pinflow-empty-state')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('pinflow-folder-section')).toBeNull();
    el.remove();
  });

  it('renders one folder-section per folder', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    el.runsByFolder = {
      '/repo/alpha': [{ runId: 'r_1', summaryPath: '/p1' } as never],
      '/repo/beta': [{ runId: 'r_2', summaryPath: '/p2' } as never],
    };
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelectorAll('pinflow-folder-section').length).toBe(2);
    el.remove();
  });

  it('marks the activeFolder section as default-expanded and isActive', async () => {
    // Arrange
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    el.runsByFolder = {
      '/repo/alpha': [{ runId: 'r_1', summaryPath: '/p1' } as never],
      '/repo/beta': [{ runId: 'r_2', summaryPath: '/p2' } as never],
    };
    el.activeFolder = '/repo/alpha';
    await el.updateComplete;

    // Assert
    const sections = el.shadowRoot!.querySelectorAll('pinflow-folder-section');
    const alphaSection = sections[0] as PinflowFolderSection;
    const betaSection = sections[1] as PinflowFolderSection;
    expect(alphaSection.defaultExpanded).toBe(true);
    expect(alphaSection.isActive).toBe(true);
    expect(betaSection.defaultExpanded).toBe(false);
    expect(betaSection.isActive).toBe(false);
    el.remove();
  });

  it('forwards folderStatus="not-configured" to the matching folder-section', async () => {
    // Arrange
    const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    app.runsByFolder = { '/a': [], '/b': [] };
    app.folderStatuses = { '/a': 'configured', '/b': 'not-configured' };
    document.body.appendChild(app);
    await app.updateComplete;

    // Act
    const sections = Array.from(
      app.shadowRoot!.querySelectorAll<PinflowFolderSection>('pinflow-folder-section'),
    );

    // Assert
    expect(sections[0].folderStatus).toBe('configured');
    expect(sections[1].folderStatus).toBe('not-configured');
    app.remove();
  });

  it('renders 5 folders × 80 runs each without throwing (stress test)', async () => {
    // Arrange
    const runsByFolder = Object.fromEntries(
      Array.from({ length: 5 }, (_, fi) => [
        `/repo/folder-${fi}`,
        Array.from({ length: 80 }, (_, ri) => ({
          runId: `r_${fi}_${ri}`,
          summaryPath: `/p${fi}_${ri}`,
        })) as never[],
      ]),
    );
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;

    // Act
    document.body.appendChild(el);
    el.runsByFolder = runsByFolder;
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelectorAll('pinflow-folder-section').length).toBe(5);
    el.remove();
  });
});

describe('<pinflow-runs-app> accordion authority', () => {
  const mounted: PinflowRunsApp[] = [];

  function makeApp(runsByFolder: Record<string, never[]>): PinflowRunsApp {
    const app = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    app.runsByFolder = runsByFolder;
    document.body.appendChild(app);
    mounted.push(app);
    return app;
  }

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    while (mounted.length) mounted.pop()!.remove();
  });

  it('emits pinflow-runs:active-change with type=expand on first card click', async () => {
    // Arrange
    const app = makeApp({ '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] });
    await app.updateComplete;

    const events: Array<CustomEvent<{ type: string; runId: string }>> = [];
    app.addEventListener('pinflow-runs:active-change', (e) =>
      events.push(e as CustomEvent<{ type: string; runId: string }>),
    );

    // Act
    app.dispatchEvent(
      new CustomEvent('pinflow-card:click', {
        detail: { runId: 'r_1' },
        bubbles: true,
        composed: true,
      }),
    );
    await app.updateComplete;

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ type: 'expand', runId: 'r_1' });
  });

  it('emits expand-then-collapse when switching active runs', async () => {
    // Arrange
    const app = makeApp({
      '/repo': [
        { runId: 'r_1', summaryPath: '/p1' } as never,
        { runId: 'r_2', summaryPath: '/p2' } as never,
      ],
    });
    await app.updateComplete;

    const events: Array<CustomEvent<{ type: string; runId: string }>> = [];
    app.addEventListener('pinflow-runs:active-change', (e) =>
      events.push(e as CustomEvent<{ type: string; runId: string }>),
    );

    // Act
    app.dispatchEvent(new CustomEvent('pinflow-card:click', {
      detail: { runId: 'r_1' }, bubbles: true, composed: true,
    }));
    await app.updateComplete;
    app.dispatchEvent(new CustomEvent('pinflow-card:click', {
      detail: { runId: 'r_2' }, bubbles: true, composed: true,
    }));
    await app.updateComplete;

    // Assert
    expect(events.map((e) => e.detail)).toEqual([
      { type: 'expand', runId: 'r_1' },
      { type: 'collapse', runId: 'r_1' },
      { type: 'expand', runId: 'r_2' },
    ]);
  });

  it('collapses to null when the active run is clicked again', async () => {
    // Arrange
    const app = makeApp({ '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] });
    await app.updateComplete;

    app.dispatchEvent(new CustomEvent('pinflow-card:click', {
      detail: { runId: 'r_1' }, bubbles: true, composed: true,
    }));
    await app.updateComplete;

    const events: Array<CustomEvent<{ type: string; runId: string }>> = [];
    app.addEventListener('pinflow-runs:active-change', (e) =>
      events.push(e as CustomEvent<{ type: string; runId: string }>),
    );

    // Act
    app.dispatchEvent(new CustomEvent('pinflow-card:click', {
      detail: { runId: 'r_1' }, bubbles: true, composed: true,
    }));
    await app.updateComplete;

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ type: 'collapse', runId: 'r_1' });
  });

  it('persists activeRunId in localStorage and restores it on next mount', async () => {
    // Arrange
    const first = makeApp({ '/repo': [{ runId: 'r_persist', summaryPath: '/p' } as never] });
    await first.updateComplete;
    first.dispatchEvent(new CustomEvent('pinflow-card:click', {
      detail: { runId: 'r_persist' }, bubbles: true, composed: true,
    }));
    await first.updateComplete;
    first.remove();

    // Act
    const second = makeApp({ '/repo': [{ runId: 'r_persist', summaryPath: '/p' } as never] });
    await second.updateComplete;

    // Assert
    const folderSection = second.shadowRoot!.querySelector(
      'pinflow-folder-section',
    ) as (HTMLElement & { activeRunId: string | null }) | null;
    expect(folderSection?.activeRunId).toBe('r_persist');
  });

  it('applies transcript:initial / append / diff:update via the public methods', async () => {
    // Arrange
    const app = makeApp({ '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] });
    await app.updateComplete;
    app.dispatchEvent(new CustomEvent('pinflow-card:click', {
      detail: { runId: 'r_1' }, bubbles: true, composed: true,
    }));
    await app.updateComplete;

    // Act
    app.applyTranscriptInitial('r_1', 'first\n');
    app.applyTranscriptAppend('r_1', 'second\n');
    app.applyDiffUpdate('r_1', [{ path: 'src/x.ts' }]);
    await app.updateComplete;

    // Assert
    const folderSection = app.shadowRoot!.querySelector(
      'pinflow-folder-section',
    ) as (HTMLElement & {
      liveTranscript: string;
      liveChangedFiles: readonly { path: string }[] | null;
    }) | null;
    expect(folderSection?.liveTranscript).toBe('first\nsecond\n');
    expect(folderSection?.liveChangedFiles).toEqual([{ path: 'src/x.ts' }]);
  });

  it('ignores transcript/diff updates targeted at a different runId', async () => {
    // Arrange
    const app = makeApp({ '/repo': [{ runId: 'r_1', summaryPath: '/p1' } as never] });
    await app.updateComplete;
    app.dispatchEvent(new CustomEvent('pinflow-card:click', {
      detail: { runId: 'r_1' }, bubbles: true, composed: true,
    }));
    await app.updateComplete;

    // Act
    app.applyTranscriptInitial('r_2', 'should be ignored');
    await app.updateComplete;

    // Assert
    const folderSection = app.shadowRoot!.querySelector(
      'pinflow-folder-section',
    ) as (HTMLElement & { liveTranscript: string }) | null;
    expect(folderSection?.liveTranscript).toBe('');
  });
});
