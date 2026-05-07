import { describe, it, expect, afterEach } from 'vitest';

import './pinflow-run-detail.js';
import { PinflowRunDetail } from './pinflow-run-detail.js';
import type { PinFlowChangedFile, PinFlowRunEvidence } from '../../core/run-evidence.js';

function makeChangedFiles(): PinFlowChangedFile[] {
  return [{ path: 'src/foo.ts' }, { path: 'src/bar.ts' }];
}

function makeRun(overrides: Partial<PinFlowRunEvidence> = {}): PinFlowRunEvidence {
  return {
    annotationId: 'ann_abc',
    runId: 'r_1',
    summary: { status: 'processed', startedAt: '2026-05-04T10:00:00Z' },
    summaryPath: '/repo/.pinflow/runs/r_1/summary.json',
    promptPath: null,
    transcriptPath: null,
    diffPath: null,
    hasDiff: false,
    changedFiles: [],
    additions: 0,
    deletions: 0,
    ...overrides,
  };
}

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe('<pinflow-run-detail>', () => {
  it('renders transcript text in a monospace <pre> when expanded', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun();
    el.transcriptText = 'line 1\nline 2\n';
    el.changedFiles = [];
    el.isLive = true; // live runs auto-expand the transcript

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    const pre = el.shadowRoot!.querySelector('pre.transcript');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain('line 1');
    expect(pre!.textContent).toContain('line 2');
  });

  it('hides the transcript by default for completed runs', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun();
    el.transcriptText = 'completed run output\n';
    el.changedFiles = [];
    el.isLive = false;

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert — pre is not in the DOM, but the toggle button is
    expect(el.shadowRoot!.querySelector('pre.transcript')).toBeNull();
    const toggle = el.shadowRoot!.querySelector<HTMLButtonElement>('.transcript-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle!.getAttribute('aria-expanded')).toBe('false');
    expect(toggle!.textContent).toContain('Show output');
  });

  it('reveals the transcript when the toggle is clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun();
    el.transcriptText = 'hidden until clicked\n';
    el.changedFiles = [];
    el.isLive = false;
    document.body.appendChild(el);
    await el.updateComplete;

    // Act
    const toggle = el.shadowRoot!.querySelector<HTMLButtonElement>('.transcript-toggle')!;
    toggle.click();
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('pre.transcript')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toContain('Hide output');
  });

  it('renders the user intent in the request section', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun({
      summary: { status: 'processed', userIntent: 'remove the logo' },
    });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.intent')!.textContent).toContain(
      'remove the logo',
    );
  });

  it('renders the source location when present', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun({
      summary: {
        status: 'processed',
        sourceLocation: { file: '/repo/src/components/Foo.tsx', line: 42 },
      },
    });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.source')!.textContent).toContain('Foo.tsx:42');
  });
});

describe('<pinflow-run-detail> sticky-bottom autoscroll', () => {
  it('autoscrolls to bottom on first transcript update', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun();
    el.transcriptText = '';
    el.changedFiles = [];
    el.isLive = true;
    document.body.appendChild(el);
    await el.updateComplete;

    // Act
    el.transcriptText = 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl\n';
    await el.updateComplete;

    // Assert
    const pre = el.shadowRoot!.querySelector<HTMLPreElement>('pre.transcript')!;
    const atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight <= 32;
    expect(atBottom).toBe(true);
  });

  it('does NOT autoscroll when user has scrolled up', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun();
    el.transcriptText = 'long\n'.repeat(100);
    el.changedFiles = [];
    el.isLive = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const pre = el.shadowRoot!.querySelector<HTMLPreElement>('pre.transcript')!;
    pre.scrollTop = 0;
    pre.dispatchEvent(new Event('scroll'));

    // Act
    el.transcriptText += 'more\n'.repeat(50);
    await el.updateComplete;

    // Assert
    expect(pre.scrollTop).toBe(0);
  });
});

describe('<pinflow-run-detail> events', () => {
  it('emits pinflow-detail:open-diff when a file row is clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun({ runId: 'r_1' });
    el.transcriptText = '';
    el.changedFiles = makeChangedFiles();
    document.body.appendChild(el);
    await el.updateComplete;

    const events: Array<CustomEvent<{ runId: string; filePath: string }>> = [];
    el.addEventListener('pinflow-detail:open-diff', (e) =>
      events.push(e as CustomEvent<{ runId: string; filePath: string }>),
    );

    // Act
    const firstRow = el.shadowRoot!.querySelector<HTMLLIElement>('li.file')!;
    firstRow.click();

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ runId: 'r_1', filePath: 'src/foo.ts' });
  });

  it('emits pinflow-detail:open-prompt when prompt button is clicked', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun({ runId: 'r_1', promptPath: '/repo/prompt.md' });
    el.transcriptText = '';
    el.changedFiles = [];
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('pinflow-detail:open-prompt', (e) =>
      events.push(e as CustomEvent),
    );

    // Act
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('button.action')!;
    button.click();

    // Assert
    expect(events).toHaveLength(1);
    expect((events[0].detail as { runId: string }).runId).toBe('r_1');
  });

  it('does not render the prompt button when promptPath is missing', async () => {
    // Arrange
    const el = document.createElement('pinflow-run-detail') as PinflowRunDetail;
    el.run = makeRun({ promptPath: null });

    // Act
    document.body.appendChild(el);
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('button.action')).toBeNull();
  });
});
