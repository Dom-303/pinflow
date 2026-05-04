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
