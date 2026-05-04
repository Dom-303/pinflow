import './pinflow-runs-header.js';
import { PinflowRunsHeader } from './pinflow-runs-header.js';

describe('<pinflow-runs-header>', () => {
  it('renders singular for count of 1', async () => {
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 1;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('1 run');
    expect(el.shadowRoot!.textContent).not.toContain('1 runs');
    el.remove();
  });

  it('renders plural for count of 0 or > 1', async () => {
    const el = document.createElement('pinflow-runs-header') as PinflowRunsHeader;
    el.count = 5;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('5 runs');
    el.remove();
  });
});
