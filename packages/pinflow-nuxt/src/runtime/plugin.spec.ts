import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Provide `window` global for Node environment (plugin.ts checks PinFlow overlay globals)
if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).window = globalThis;
}

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockInitialize,
  mockGetInstance,
  mockCreateVueAdapter,
  mockInitOverlay,
  captured,
} = vi.hoisted(() => {
  const mockInitialize = vi.fn();
  return {
    mockInitialize,
    mockGetInstance: vi.fn(() => ({ initialize: mockInitialize })),
    mockCreateVueAdapter: vi.fn(() => ({ name: 'vue-adapter' })),
    mockInitOverlay: vi.fn(),
    captured: { pluginFn: undefined as (() => Promise<void>) | undefined },
  };
});

vi.mock('#imports', () => ({
  defineNuxtPlugin: (fn: () => Promise<void>) => {
    captured.pluginFn = fn;
    return fn;
  },
}));

vi.mock('@pinflow/runtime', () => ({
  RuntimeManager: { getInstance: mockGetInstance },
}));

vi.mock('@pinflow/vue', () => ({
  createVueAdapter: mockCreateVueAdapter,
}));

vi.mock('@pinflow/overlay', () => ({
  initOverlay: mockInitOverlay,
}));

// Trigger the module-level defineNuxtPlugin call
import './plugin.js';

// ── Tests ────────────────────────────────────────────────────────────────────

function getPluginFn(): () => Promise<void> {
  if (!captured.pluginFn) {
    throw new Error('Plugin function not captured');
  }
  return captured.pluginFn;
}

describe('runtime/plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>)[
      '__PINFLOW_OVERLAY_OPTIONS__'
    ];
    delete (globalThis as unknown as Record<string, unknown>)[
      '__PINFLOW_RUNTIME_OPTIONS__'
    ];
    delete (globalThis as unknown as Record<string, unknown>)[
      '__PINFLOW_ADAPTER_OPTIONS__'
    ];
  });

  it('should register a plugin function via defineNuxtPlugin', () => {
    expect(captured.pluginFn).toBeDefined();
    expect(typeof captured.pluginFn).toBe('function');
  });

  it('should initialize RuntimeManager with a VueAdapter', async () => {
    await getPluginFn()();

    expect(mockGetInstance).toHaveBeenCalled();
    expect(mockCreateVueAdapter).toHaveBeenCalledWith({});
    expect(mockInitialize).toHaveBeenCalledWith({
      adapter: { name: 'vue-adapter' },
    });
  });

  it('should pass injected runtime and adapter options into RuntimeManager', async () => {
    (globalThis as unknown as Record<string, unknown>)[
      '__PINFLOW_RUNTIME_OPTIONS__'
    ] = {
      phase: 2,
      redactPII: false,
      blockSelectors: ['.secret'],
    };
    (globalThis as unknown as Record<string, unknown>)[
      '__PINFLOW_ADAPTER_OPTIONS__'
    ] = {
      maxTreeDepth: 12,
      debug: true,
    };

    await getPluginFn()();

    expect(mockCreateVueAdapter).toHaveBeenCalledWith({
      maxTreeDepth: 12,
      debug: true,
    });
    expect(mockInitialize).toHaveBeenCalledWith({
      phase: 2,
      redactPII: false,
      blockSelectors: ['.secret'],
      adapter: { name: 'vue-adapter' },
    });
  });

  it('should initialize overlay when __PINFLOW_OVERLAY_OPTIONS__ is set', async () => {
    (globalThis as unknown as Record<string, unknown>)[
      '__PINFLOW_OVERLAY_OPTIONS__'
    ] = { initialMode: 'expanded' };

    await getPluginFn()();

    expect(mockInitOverlay).toHaveBeenCalled();
  });

  it('should not initialize overlay when no PinFlow overlay options are set', async () => {
    await getPluginFn()();

    expect(mockInitOverlay).not.toHaveBeenCalled();
  });

  it('should handle overlay init failure gracefully', async () => {
    (globalThis as unknown as Record<string, unknown>)[
      '__PINFLOW_OVERLAY_OPTIONS__'
    ] = {};
    mockInitOverlay.mockRejectedValue(new Error('overlay broken'));

    // Should not throw
    await getPluginFn()();

    expect(mockInitOverlay).toHaveBeenCalled();
  });
});
