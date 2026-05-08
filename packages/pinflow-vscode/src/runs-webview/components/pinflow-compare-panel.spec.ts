import './pinflow-compare-panel.js';
import { PinflowComparePanel } from './pinflow-compare-panel.js';
import type { PinFlowRunEvidence } from '../../core/run-evidence.js';

function makeRun(overrides: Partial<PinFlowRunEvidence> = {}): PinFlowRunEvidence {
  return {
    annotationId: 'ann_a',
    runId: 'r_a',
    summary: {
      status: 'processed',
      provider: 'codex',
      model: 'gpt-5',
      startedAt: '2026-05-04T10:00:00Z',
      finishedAt: '2026-05-04T10:00:30Z',
      durationMs: 30000,
      totalTokens: 1200,
      costUsd: 0.05,
    },
    summaryPath: '/repo/.pinflow/runs/r_a/summary.json',
    promptPath: null,
    transcriptPath: null,
    diffPath: null,
    hasDiff: true,
    changedFiles: [{ path: 'src/foo.ts' }],
    additions: 0,
    deletions: 0,
    ...overrides,
  };
}

describe('<pinflow-compare-panel>', () => {
  const mounted: HTMLElement[] = [];

  function mount(): PinflowComparePanel {
    const el = document.createElement('pinflow-compare-panel') as PinflowComparePanel;
    document.body.appendChild(el);
    mounted.push(el);
    return el;
  }

  afterEach(() => {
    while (mounted.length) mounted.pop()!.remove();
  });

  it('renders nothing when one of the runs is missing', async () => {
    // Arrange
    const el = mount();
    el.left = makeRun();
    el.right = null;

    // Act
    await el.updateComplete;

    // Assert
    expect(el.shadowRoot!.querySelector('.panel')).toBeNull();
  });

  it('renders provider · model in each column header', async () => {
    // Arrange
    const el = mount();
    el.left = makeRun({
      summary: {
        provider: 'codex',
        model: 'gpt-5',
        startedAt: '2026-05-04T10:00:00Z',
        finishedAt: '2026-05-04T10:00:30Z',
      },
    });
    el.right = makeRun({
      summary: {
        provider: 'claude',
        model: 'opus-4.7',
        startedAt: '2026-05-04T10:01:00Z',
        finishedAt: '2026-05-04T10:01:20Z',
      },
    });

    // Act
    await el.updateComplete;

    // Assert
    const headers = Array.from(el.shadowRoot!.querySelectorAll('.col-header')).map(
      (h) => h.textContent?.trim() ?? '',
    );
    expect(headers).toEqual(['codex · gpt-5', 'claude · opus-4.7']);
  });

  it('formats tokens using k suffix and cost as ~$X.XX', async () => {
    // Arrange
    const el = mount();
    el.left = makeRun({
      summary: {
        provider: 'codex',
        startedAt: '2026-05-04T10:00:00Z',
        totalTokens: 12400,
        costUsd: 0.07,
      },
    });
    el.right = makeRun({
      summary: {
        provider: 'codex',
        startedAt: '2026-05-04T10:00:00Z',
        totalTokens: 800,
        costUsd: undefined,
      },
    });

    // Act
    await el.updateComplete;

    // Assert
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('12.4k');
    expect(text).toContain('800');
    expect(text).toContain('~$0.07');
    expect(text.match(/Cost[\s\S]*?—/)).not.toBeNull();
  });

  it('truncates the changed-files list to 10 items and shows +N more', async () => {
    // Arrange
    const files = Array.from({ length: 14 }, (_, i) => ({ path: `src/file-${i}.ts` }));
    const el = mount();
    el.left = makeRun({ changedFiles: files });
    el.right = makeRun();

    // Act
    await el.updateComplete;

    // Assert
    const leftCol = el.shadowRoot!.querySelectorAll('.col')[0];
    expect(leftCol.querySelectorAll('li.file').length).toBe(10);
    expect(leftCol.querySelector('.more')!.textContent).toContain('+4 more');
  });

  it('shows signed deltas when both runs have cost/tokens/duration', async () => {
    // Arrange
    const el = mount();
    el.left = makeRun({
      summary: {
        startedAt: '2026-05-04T10:00:00Z',
        finishedAt: '2026-05-04T10:00:30Z',
        durationMs: 30000,
        totalTokens: 1000,
        costUsd: 0.05,
      },
    });
    el.right = makeRun({
      summary: {
        startedAt: '2026-05-04T10:00:00Z',
        finishedAt: '2026-05-04T10:00:42Z',
        durationMs: 42000,
        totalTokens: 2200,
        costUsd: 0.12,
      },
    });

    // Act
    await el.updateComplete;

    // Assert
    const deltaText = el.shadowRoot!.querySelector('.delta')!.textContent ?? '';
    expect(deltaText).toContain('+$0.07');
    expect(deltaText).toContain('+1.2k');
    expect(deltaText).toContain('+12s');
  });

  it('renders em-dash deltas when costUsd is missing on either side', async () => {
    // Arrange
    const el = mount();
    el.left = makeRun({
      summary: {
        startedAt: '2026-05-04T10:00:00Z',
        finishedAt: '2026-05-04T10:00:30Z',
        durationMs: 30000,
        totalTokens: 1000,
      },
    });
    el.right = makeRun({
      summary: {
        startedAt: '2026-05-04T10:00:00Z',
        finishedAt: '2026-05-04T10:00:30Z',
        durationMs: 30000,
        totalTokens: 1000,
      },
    });

    // Act
    await el.updateComplete;

    // Assert
    const items = Array.from(el.shadowRoot!.querySelectorAll('.delta-item'));
    const costItem = items.find((i) => i.textContent?.includes('Cost:'));
    expect(costItem!.textContent).toContain('—');
  });

  it('lists shared files when both runs touched the same path', async () => {
    // Arrange
    const el = mount();
    el.left = makeRun({
      changedFiles: [{ path: 'src/foo.ts' }, { path: 'src/bar.ts' }],
    });
    el.right = makeRun({
      changedFiles: [{ path: 'src/foo.ts' }, { path: 'src/baz.ts' }],
    });

    // Act
    await el.updateComplete;

    // Assert
    const deltaText = el.shadowRoot!.querySelector('.delta')!.textContent ?? '';
    expect(deltaText).toContain('Both touched:');
    expect(deltaText).toContain('1 file');
    const sharedList = el.shadowRoot!.querySelector('.shared-files ul')!;
    expect(sharedList.textContent).toContain('src/foo.ts');
  });
});
