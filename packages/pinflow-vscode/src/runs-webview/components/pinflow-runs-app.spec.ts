import './pinflow-runs-app.js';
import { PinflowRunsApp } from './pinflow-runs-app.js';

describe('<pinflow-runs-app>', () => {
  it('renders empty-state when runs is empty', async () => {
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('pinflow-empty-state')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('pinflow-run-card')).toBeNull();
    el.remove();
  });

  it('renders one card per run', async () => {
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    el.runs = [
      { runId: 'r_1', summary: { status: 'processed' }, summaryPath: '/p1' } as never,
      { runId: 'r_2', summary: { status: 'failed' }, summaryPath: '/p2' } as never,
    ];
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('pinflow-run-card').length).toBe(2);
    el.remove();
  });

  it('renders 80 cards without throwing (stress test)', async () => {
    const el = document.createElement('pinflow-runs-app') as PinflowRunsApp;
    el.runs = Array.from({ length: 80 }, (_, i) => ({
      runId: `r_${i}`,
      summary: { status: 'processed' },
      summaryPath: `/p${i}`,
    })) as never[];
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('pinflow-run-card').length).toBe(80);
    el.remove();
  });
});
