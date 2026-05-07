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
  it('renders the annotation id in the editor-font slot', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ annotationId: 'ann_xyz' });
    el.timeFormat = '24h';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.annotation-id')!.textContent).toContain(
      'ann_xyz',
    );
    el.remove();
  });

  it('falls back to runId when annotationId is missing', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ annotationId: undefined, runId: 'r_42' });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.annotation-id')!.textContent).toContain('r_42');
    el.remove();
  });

  it('dispatches pinflow-card:click with runId on click', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ runId: 'r_clicked' });
    document.body.appendChild(el);
    await el.updateComplete;
    const events: Array<CustomEvent<{ runId: string }>> = [];
    el.addEventListener('pinflow-card:click', (e) =>
      events.push(e as CustomEvent<{ runId: string }>),
    );
    el.shadowRoot!
      .querySelector<HTMLElement>('.card')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(events).toHaveLength(1);
    expect(events[0].detail.runId).toBe('r_clicked');
    el.remove();
  });

  it('renders the lifecycle pill with mapped state', async () => {
    const el = document.createElement('pinflow-run-card') as PinflowRunCard;
    el.run = makeRun({ summary: { status: 'failed' } });
    document.body.appendChild(el);
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('pinflow-lifecycle-pill') as
      | (HTMLElement & { state: string })
      | null;
    expect(pill).not.toBeNull();
    expect(pill!.state).toBe('failed');
    el.remove();
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
    el.run = makeRun({
      runId: 'r_42',
      changedFiles: [{ path: 'src/foo.ts' }],
      promptPath: '/repo/prompt.md',
    });
    el.isExpanded = true;
    el.liveTranscript = 'streaming...';
    el.liveChangedFiles = [{ path: 'src/bar.ts' }];

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const detail = el.shadowRoot!.querySelector('pinflow-run-detail') as
      | (HTMLElement & {
          runId: string;
          transcriptText: string;
          changedFiles: readonly { path: string }[];
          promptPath: string | null;
        })
      | null;
    expect(detail).not.toBeNull();
    expect(detail!.runId).toBe('r_42');
    expect(detail!.transcriptText).toBe('streaming...');
    expect(detail!.changedFiles).toEqual([{ path: 'src/bar.ts' }]);
    expect(detail!.promptPath).toBe('/repo/prompt.md');
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
