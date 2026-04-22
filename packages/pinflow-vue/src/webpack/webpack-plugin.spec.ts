// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Compiler } from 'webpack';

const mockBaseApply = vi.fn();

vi.mock('@pinflow/transform/plugins/webpack', () => ({
  PinFlowWebpackPlugin: class {
    apply = mockBaseApply;
  },
  DomscribeWebpackPlugin: class {
    apply = mockBaseApply;
  },
}));

import {
  DomscribeWebpackPlugin,
  PinFlowWebpackPlugin,
} from './webpack-plugin.js';

const mockDefinePluginApply = vi.fn();

class MockDefinePlugin {
  definitions: Record<string, string>;
  static calls: Record<string, string>[] = [];
  constructor(definitions: Record<string, string>) {
    this.definitions = definitions;
    MockDefinePlugin.calls.push(definitions);
  }
  apply = mockDefinePluginApply;
}

function createMockCompiler(
  entry: Record<string, { import: string[] }> = {
    main: { import: ['./src/index.ts'] },
  },
): Compiler {
  return {
    options: { entry },
    webpack: { DefinePlugin: MockDefinePlugin },
  } as unknown as Compiler;
}

describe('PinFlowWebpackPlugin (vue)', () => {
  beforeEach(() => {
    mockBaseApply.mockReset();
    mockDefinePluginApply.mockClear();
    MockDefinePlugin.calls = [];
  });

  it('should keep DomscribeWebpackPlugin as a compatibility alias', () => {
    expect(DomscribeWebpackPlugin).toBe(PinFlowWebpackPlugin);
  });

  it('should add auto-init entry to first entry point', () => {
    const plugin = new PinFlowWebpackPlugin();
    const compiler = createMockCompiler();

    plugin.apply(compiler);

    expect(compiler.options.entry).toEqual({
      main: { import: ['./src/index.ts', '@pinflow/vue/auto-init'] },
    });
  });

  it('should call base plugin apply', () => {
    const plugin = new PinFlowWebpackPlugin();
    const compiler = createMockCompiler();

    plugin.apply(compiler);

    expect(mockBaseApply).toHaveBeenCalledWith(compiler);
  });

  it('should add entry before calling base plugin', () => {
    mockBaseApply.mockImplementation((c: Compiler) => {
      const entry = c.options.entry as Record<string, { import: string[] }>;
      expect(entry.main.import).toContain('@pinflow/vue/auto-init');
    });
    const plugin = new PinFlowWebpackPlugin();
    const compiler = createMockCompiler();

    plugin.apply(compiler);

    expect(mockBaseApply).toHaveBeenCalled();
  });

  it('should handle entry without import array', () => {
    const plugin = new PinFlowWebpackPlugin();
    const compiler = createMockCompiler({ main: {} } as unknown as Record<
      string,
      { import: string[] }
    >);

    plugin.apply(compiler);

    expect(mockBaseApply).toHaveBeenCalled();
  });

  it('should handle non-object entry', () => {
    const plugin = new PinFlowWebpackPlugin();
    const compiler = {
      options: { entry: './src/index.ts' },
      webpack: { DefinePlugin: MockDefinePlugin },
    } as unknown as Compiler;

    plugin.apply(compiler);

    expect(mockBaseApply).toHaveBeenCalled();
  });

  it('should handle empty entry object', () => {
    const plugin = new PinFlowWebpackPlugin();
    const compiler = createMockCompiler({});

    plugin.apply(compiler);

    expect(mockBaseApply).toHaveBeenCalled();
  });

  it('should only modify the first entry key', () => {
    const plugin = new PinFlowWebpackPlugin();
    const compiler = createMockCompiler({
      main: { import: ['./src/main.ts'] },
      vendor: { import: ['./src/vendor.ts'] },
    });

    plugin.apply(compiler);

    const entry = compiler.options.entry as Record<
      string,
      { import: string[] }
    >;
    expect(entry.main.import).toContain('@pinflow/vue/auto-init');
    expect(entry.vendor.import).not.toContain('@pinflow/vue/auto-init');
  });

  describe('DefinePlugin injection', () => {
    it('should apply DefinePlugin with default options', () => {
      const plugin = new PinFlowWebpackPlugin();
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      expect(MockDefinePlugin.calls).toHaveLength(1);
      expect(MockDefinePlugin.calls[0]).toEqual({
        __PINFLOW_RUNTIME_OPTIONS__: JSON.stringify({
          phase: undefined,
          debug: false,
          redactPII: undefined,
          blockSelectors: undefined,
        }),
        __PINFLOW_ADAPTER_OPTIONS__: JSON.stringify({
          maxTreeDepth: undefined,
          debug: false,
        }),
      });
      expect(mockDefinePluginApply).toHaveBeenCalledWith(compiler);
    });

    it('should inject custom runtime options', () => {
      const plugin = new PinFlowWebpackPlugin({
        runtime: { phase: 2, redactPII: false, blockSelectors: ['.secret'] },
      });
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      const definitions = MockDefinePlugin.calls[0];
      const runtimeOpts = JSON.parse(definitions.__PINFLOW_RUNTIME_OPTIONS__);
      expect(runtimeOpts.phase).toBe(2);
      expect(runtimeOpts.redactPII).toBe(false);
      expect(runtimeOpts.blockSelectors).toEqual(['.secret']);
    });

    it('should inject custom capture options', () => {
      const plugin = new PinFlowWebpackPlugin({
        capture: { maxTreeDepth: 25 },
      });
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      const definitions = MockDefinePlugin.calls[0];
      const adapterOpts = JSON.parse(definitions.__PINFLOW_ADAPTER_OPTIONS__);
      expect(adapterOpts.maxTreeDepth).toBe(25);
    });

    it('should cascade debug to both runtime and adapter definitions', () => {
      const plugin = new PinFlowWebpackPlugin({ debug: true });
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      const definitions = MockDefinePlugin.calls[0];
      const runtimeOpts = JSON.parse(definitions.__PINFLOW_RUNTIME_OPTIONS__);
      const adapterOpts = JSON.parse(definitions.__PINFLOW_ADAPTER_OPTIONS__);
      expect(runtimeOpts.debug).toBe(true);
      expect(adapterOpts.debug).toBe(true);
    });

    it('should apply DefinePlugin before base plugin', () => {
      const callOrder: string[] = [];
      mockDefinePluginApply.mockImplementation(() => callOrder.push('define'));
      mockBaseApply.mockImplementation(() => callOrder.push('base'));

      const plugin = new PinFlowWebpackPlugin();
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      expect(callOrder).toEqual(['define', 'base']);
    });
  });
});
