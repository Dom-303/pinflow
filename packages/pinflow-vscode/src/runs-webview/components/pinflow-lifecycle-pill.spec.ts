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
  it('reflects each state to a state="..." attribute on the host', async () => {
    const states = ['processing', 'processed', 'failed', 'unknown'] as const;
    for (const state of states) {
      const el = document.createElement(
        'pinflow-lifecycle-pill',
      ) as PinflowLifecyclePill;
      el.state = state;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('state')).toBe(state);
      el.remove();
    }
  });

  it('renders the correct codicon icon class for each state', async () => {
    const cases: Array<{ state: 'processing' | 'processed' | 'failed' | 'unknown'; icon: string }> = [
      { state: 'processing', icon: 'codicon-loading' },
      { state: 'processed', icon: 'codicon-check' },
      { state: 'failed', icon: 'codicon-error' },
      { state: 'unknown', icon: 'codicon-circle-outline' },
    ];
    for (const { state, icon } of cases) {
      const el = document.createElement(
        'pinflow-lifecycle-pill',
      ) as PinflowLifecyclePill;
      el.state = state;
      document.body.appendChild(el);
      await el.updateComplete;
      const iconElement = el.shadowRoot!.querySelector('i');
      expect(iconElement?.className).toContain(icon);
      el.remove();
    }
  });

  it('updates the host attribute when the state property changes', async () => {
    const el = document.createElement(
      'pinflow-lifecycle-pill',
    ) as PinflowLifecyclePill;
    el.state = 'processing';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('state')).toBe('processing');

    el.state = 'processed';
    await el.updateComplete;
    expect(el.getAttribute('state')).toBe('processed');
    el.remove();
  });
});
