// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInitialize = vi.fn();
const mockGetInstance = vi.fn(() => ({ initialize: mockInitialize }));
const mockCreateReactAdapter = vi.fn(() => ({ name: 'react-adapter' }));
const mockInitOverlay = vi.fn();

vi.mock('@pinflow/runtime', () => ({
  RuntimeManager: { getInstance: mockGetInstance },
}));

vi.mock('@pinflow/react', () => ({
  createReactAdapter: mockCreateReactAdapter,
}));

vi.mock('@pinflow/overlay', () => ({
  initOverlay: mockInitOverlay,
}));

describe('auto-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[
      '__PINFLOW_OVERLAY_OPTIONS__'
    ];
    delete (globalThis as Record<string, unknown>)[
      '__DOMSCRIBE_OVERLAY_OPTIONS__'
    ];
  });

  it('should initialize runtime and react adapter', async () => {
    await import('./index.js');
    await vi.dynamicImportSettled();

    expect(mockGetInstance).toHaveBeenCalled();
    expect(mockCreateReactAdapter).toHaveBeenCalled();
    expect(mockInitialize).toHaveBeenCalledWith({
      adapter: { name: 'react-adapter' },
    });
  });

  it('should initialize overlay when __PINFLOW_OVERLAY_OPTIONS__ is set', async () => {
    (globalThis as Record<string, unknown>)['__PINFLOW_OVERLAY_OPTIONS__'] = {
      initialMode: 'collapsed',
    };

    await import('./index.js');
    await vi.dynamicImportSettled();

    expect(mockInitOverlay).toHaveBeenCalled();
  });

  it('should still initialize overlay from the legacy __DOMSCRIBE_OVERLAY_OPTIONS__ fallback', async () => {
    (globalThis as Record<string, unknown>)['__DOMSCRIBE_OVERLAY_OPTIONS__'] = {
      initialMode: 'collapsed',
    };

    await import('./index.js');
    await vi.dynamicImportSettled();

    expect(mockInitOverlay).toHaveBeenCalled();
  });

  it('should not initialize overlay when neither PinFlow nor legacy overlay options are set', async () => {
    await import('./index.js');
    await vi.dynamicImportSettled();

    expect(mockInitOverlay).not.toHaveBeenCalled();
  });
});
