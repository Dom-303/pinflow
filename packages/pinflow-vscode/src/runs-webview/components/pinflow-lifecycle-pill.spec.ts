import './pinflow-lifecycle-pill.js';
import {
  PinflowLifecyclePill,
  mapStatusToPillState,
} from './pinflow-lifecycle-pill.js';

describe('mapStatusToPillState', () => {
  it("maps 'processing' to 'processing'", () => {
    expect(mapStatusToPillState('processing')).toBe('processing');
  });

  it("maps 'processed' to 'processed'", () => {
    expect(mapStatusToPillState('processed')).toBe('processed');
  });

  it("maps 'failed' to 'failed'", () => {
    expect(mapStatusToPillState('failed')).toBe('failed');
  });

  it("maps undefined to 'unknown'", () => {
    expect(mapStatusToPillState(undefined)).toBe('unknown');
  });

  it("maps 'pending' (unrecognized) to 'unknown'", () => {
    expect(mapStatusToPillState('pending')).toBe('unknown');
  });

  it("maps 'cancelled' (unrecognized) to 'unknown'", () => {
    expect(mapStatusToPillState('cancelled')).toBe('unknown');
  });

  it('maps an arbitrary string to unknown', () => {
    expect(mapStatusToPillState('foo-bar')).toBe('unknown');
  });
});

describe('<pinflow-lifecycle-pill>', () => {
  it('renders the four states with distinct shadow-DOM classes', async () => {
    const states = ['processing', 'processed', 'failed', 'unknown'] as const;
    for (const state of states) {
      const el = document.createElement(
        'pinflow-lifecycle-pill',
      ) as PinflowLifecyclePill;
      el.state = state;
      document.body.appendChild(el);
      await el.updateComplete;
      const root = el.shadowRoot;
      expect(root).toBeDefined();
      expect(root!.querySelector(`[data-state='${state}']`)).not.toBeNull();
      el.remove();
    }
  });

  it('updates the rendered state when the property changes', async () => {
    const el = document.createElement(
      'pinflow-lifecycle-pill',
    ) as PinflowLifecyclePill;
    el.state = 'processing';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector("[data-state='processing']")).not.toBeNull();

    el.state = 'processed';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector("[data-state='processed']")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("[data-state='processing']")).toBeNull();
    el.remove();
  });
});
