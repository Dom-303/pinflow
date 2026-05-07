import './pinflow-empty-state.js';
import { PinflowEmptyState } from './pinflow-empty-state.js';

describe('<pinflow-empty-state>', () => {
  it('renders the empty-state copy', async () => {
    const el = document.createElement('pinflow-empty-state') as PinflowEmptyState;
    document.body.appendChild(el);
    await el.updateComplete;
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('No runs yet');
    expect(text).toContain('Actions');
    el.remove();
  });
});
