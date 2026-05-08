import './pinflow-run-card.js';
import { PinflowRunCard } from './pinflow-run-card.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';

function makeRun(overrides: Partial<PinFlowRunEvidence> = {}): PinFlowRunEvidence {
  return {
    annotationId: 'ann_abc',
    runId: 'r_1',
    summary: { status: 'processed', startedAt: '2026-05-04T10:00:00Z' },
    summaryPath: '/repo/.pinflow/runs/r_1/summary.json',
    promptPath: '/repo/.pinflow/runs/r_1/prompt.md',
    transcriptPath: null,
    diffPath: null,
    hasDiff: false,
    changedFiles: [],
    additions: 0,
    deletions: 0,
    ...overrides,
  };
}

describe('<pinflow-run-card>', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the user intent as primary label when present', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ summary: { status: 'processed', userIntent: 'remove logo' } });
    el.timeFormat = '24h';

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toContain('remove logo');
  });

  it('falls back to annotationId when userIntent missing', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ annotationId: 'ann_xyz' });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toContain('ann_xyz');
  });

  it('falls back to runId when both userIntent and annotationId are missing', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ annotationId: undefined, runId: 'r_42' });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toContain('r_42');
  });

  it('dispatches pinflow-card:click with runId on click', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ runId: 'r_clicked' });
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Array<CustomEvent<{ runId: string }>> = [];
    el.addEventListener('pinflow-card:click', (e) =>
      events.push(e as CustomEvent<{ runId: string }>),
    );

    // Act
    el.shadowRoot!
      .querySelector<HTMLElement>('.card')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail.runId).toBe('r_clicked');
  });

  it('reflects status onto the card via data-state', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ summary: { status: 'failed' } });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const card = el.shadowRoot!.querySelector<HTMLElement>('.card')!;
    expect(card.dataset['state']).toBe('failed');
    expect(el.shadowRoot!.querySelector('.status-icon.failed')).not.toBeNull();
  });
});

describe('<pinflow-run-card> expanded detail', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not render <pinflow-run-detail> when isExpanded is false (default)', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun();

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('pinflow-run-detail')).toBeNull();
  });

  it('renders <pinflow-run-detail> when isExpanded is true and forwards props', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    const run = makeRun({
      runId: 'r_42',
      changedFiles: [{ path: 'src/foo.ts' }],
      promptPath: '/repo/prompt.md',
    });
    el.run = run;
    el.isExpanded = true;
    el.liveTranscript = 'streaming...';
    el.liveChangedFiles = [{ path: 'src/bar.ts' }];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const detail = el.shadowRoot!.querySelector('pinflow-run-detail') as
      | (HTMLElement & {
          run: PinFlowRunEvidence | null;
          transcriptText: string;
          changedFiles: readonly { path: string }[];
        })
      | null;
    expect(detail).not.toBeNull();
    expect(detail!.run?.runId).toBe('r_42');
    expect(detail!.transcriptText).toBe('streaming...');
    expect(detail!.changedFiles).toEqual([{ path: 'src/bar.ts' }]);
  });

  it('falls back to run.changedFiles when liveChangedFiles is null', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({
      changedFiles: [{ path: 'src/static.ts' }],
    });
    el.isExpanded = true;
    el.liveChangedFiles = null;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const detail = el.shadowRoot!.querySelector('pinflow-run-detail') as
      | (HTMLElement & { changedFiles: readonly { path: string }[] })
      | null;
    expect(detail!.changedFiles).toEqual([{ path: 'src/static.ts' }]);
  });

  it('still emits pinflow-card:click on outer card click when expanded', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ runId: 'r_clicked' });
    el.isExpanded = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Array<CustomEvent<{ runId: string }>> = [];
    el.addEventListener('pinflow-card:click', (e) =>
      events.push(e as CustomEvent<{ runId: string }>),
    );

    // Act
    el.shadowRoot!
      .querySelector<HTMLElement>('.card')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail.runId).toBe('r_clicked');
  });
});

describe('<pinflow-run-card> compare mode', () => {
  const mounted: PinflowRunCard[] = [];

  function mount(run: PinFlowRunEvidence): PinflowRunCard {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = run;
    document.body.appendChild(el);
    mounted.push(el);
    return el;
  }

  afterEach(() => {
    while (mounted.length) mounted.pop()!.remove();
  });

  it('renders a checkbox affordance only in compare mode', async () => {
    // Arrange
    const el = mount(makeRun());

    // Act
    await el.updateComplete;
    const before = el.shadowRoot!.querySelector('.checkbox');
    el.compareMode = true;
    await el.updateComplete;
    const after = el.shadowRoot!.querySelector('.checkbox');

    // Assert
    expect(before).toBeNull();
    expect(after).not.toBeNull();
  });

  it('reflects selected onto host attribute and aria-checked', async () => {
    // Arrange
    const el = mount(makeRun());
    el.compareMode = true;
    el.selected = true;

    // Act
    await el.updateComplete;

    // Assert
    expect(el.hasAttribute('selected')).toBe(true);
    expect(
      el.shadowRoot!.querySelector('.checkbox')!.getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('emits pinflow-card:select instead of click when compareMode is on', async () => {
    // Arrange
    const el = mount(makeRun({ runId: 'r_sel' }));
    el.compareMode = true;
    await el.updateComplete;

    const selectEvents: Array<CustomEvent<{ runId: string }>> = [];
    const clickEvents: Array<CustomEvent<{ runId: string }>> = [];
    el.addEventListener('pinflow-card:select', (e) =>
      selectEvents.push(e as CustomEvent<{ runId: string }>),
    );
    el.addEventListener('pinflow-card:click', (e) =>
      clickEvents.push(e as CustomEvent<{ runId: string }>),
    );

    // Act
    el.shadowRoot!
      .querySelector<HTMLElement>('.card')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    // Assert
    expect(clickEvents).toHaveLength(0);
    expect(selectEvents).toHaveLength(1);
    expect(selectEvents[0].detail.runId).toBe('r_sel');
  });
});

describe('<pinflow-run-card> cost metadata', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a cost-meta line when at least one cost field is present', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({
      summary: {
        status: 'processed',
        startedAt: '2026-05-08T10:00:00Z',
        provider: 'codex',
        model: 'gpt-5.5',
        totalTokens: 12_400,
        costUsd: 0.05,
        durationMs: 47_000,
      },
    });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const meta = el.shadowRoot!.querySelector('.cost-meta');
    expect(meta).not.toBeNull();
    const text = meta!.textContent ?? '';
    expect(text).toContain('codex · gpt-5.5');
    expect(text).toContain('12.4k tok');
    expect(text).toContain('~$0.05');
    expect(text).toContain('47s');
  });

  it('omits the cost-meta line entirely when no cost fields are populated', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({
      summary: { status: 'processed', startedAt: '2026-05-08T10:00:00Z' },
    });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.cost-meta')).toBeNull();
  });

  it('renders only the populated segments when others are missing', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({
      summary: {
        status: 'processed',
        startedAt: '2026-05-08T10:00:00Z',
        durationMs: 12_000,
        // model, totalTokens, costUsd missing
      },
    });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const meta = el.shadowRoot!.querySelector('.cost-meta');
    expect(meta).not.toBeNull();
    const text = meta!.textContent ?? '';
    expect(text).toContain('12s');
    expect(text).not.toContain('tok');
    expect(text).not.toContain('$');
  });
});
