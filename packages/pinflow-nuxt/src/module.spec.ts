import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PinFlowNuxtOptions } from './types.js';

// ── Hoisted mocks (available inside vi.mock factories) ───────────────────────

interface MockNuxt {
  options: {
    dev: boolean;
    rootDir: string;
    pinflow?: PinFlowNuxtOptions;
    app: {
      head: {
        script: Array<{ innerHTML: string }>;
      };
    };
  };
}

interface CapturedModuleDefinition {
  meta: Record<string, unknown>;
  defaults: PinFlowNuxtOptions;
  setup: (options: PinFlowNuxtOptions, nuxt: MockNuxt) => Promise<void> | void;
}

const {
  mockAddPlugin,
  mockAddVitePlugin,
  mockExtendWebpackConfig,
  mockResolve,
  mockPinFlowVitePlugin,
  mockShouldStartRunner,
  MockPinFlowWebpackPlugin,
  mockEnsureRunning,
  mockRunnerEnsureRunning,
  MockRelayControl,
  MockRunnerControl,
  captured,
} = vi.hoisted(() => {
  const mockEnsureRunning = vi.fn().mockResolvedValue({
    host: '127.0.0.1',
    port: 4400,
  });
  const mockRunnerEnsureRunning = vi.fn().mockResolvedValue({
    running: true,
    wasStarted: true,
    provider: 'codex',
  });
  return {
    mockAddPlugin: vi.fn(),
    mockAddVitePlugin: vi.fn(),
    mockExtendWebpackConfig: vi.fn(),
    mockResolve: vi.fn((path: string) => `/resolved${path}`),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockPinFlowVitePlugin: vi.fn((_opts: unknown) => ({
      name: 'vite-plugin-pinflow',
      apply: 'serve' as string | undefined,
    })),
    mockShouldStartRunner: vi.fn(
      (runner?: { mode?: string; autoStart?: boolean }) =>
        runner?.mode ? runner.mode === 'auto' : runner?.autoStart === true,
    ),
    MockPinFlowWebpackPlugin: vi.fn(),
    mockEnsureRunning,
    mockRunnerEnsureRunning,
    MockRelayControl: vi.fn(function (this: {
      ensureRunning: typeof mockEnsureRunning;
    }) {
      this.ensureRunning = mockEnsureRunning;
    }),
    MockRunnerControl: vi.fn(function (this: {
      ensureRunning: typeof mockRunnerEnsureRunning;
    }) {
      this.ensureRunning = mockRunnerEnsureRunning;
    }),
    captured: {
      moduleDefinition: undefined as CapturedModuleDefinition | undefined,
    },
  };
});

// ── Mock registrations ───────────────────────────────────────────────────────

vi.mock('@nuxt/kit', () => ({
  addPlugin: (...args: unknown[]) => mockAddPlugin(...args),
  addVitePlugin: (...args: unknown[]) => mockAddVitePlugin(...args),
  extendWebpackConfig: (...args: unknown[]) => mockExtendWebpackConfig(...args),
  createResolver: () => ({ resolve: mockResolve }),
  defineNuxtModule: (definition: CapturedModuleDefinition) => {
    captured.moduleDefinition = definition;
    return definition;
  },
}));

vi.mock('@pinflow/transform/plugins/vite', () => ({
  pinflow: (opts: unknown) => mockPinFlowVitePlugin(opts),
  shouldStartRunner: (runner: unknown) => mockShouldStartRunner(runner),
}));

vi.mock('@pinflow/transform/plugins/webpack', () => ({
  PinFlowWebpackPlugin: MockPinFlowWebpackPlugin,
}));

vi.mock('@pinflow/relay', () => ({
  RelayControl: MockRelayControl,
  RunnerControl: MockRunnerControl,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockNuxt(overrides?: Partial<MockNuxt['options']>): MockNuxt {
  return {
    options: {
      dev: true,
      rootDir: '/test/project',
      app: {
        head: {
          script: [],
        },
      },
      ...overrides,
    },
  };
}

function getModuleDefinition(): CapturedModuleDefinition {
  if (!captured.moduleDefinition) {
    throw new Error('Module definition not captured');
  }
  return captured.moduleDefinition;
}

function callSetup(
  options: PinFlowNuxtOptions,
  nuxt: MockNuxt,
): Promise<void> | void {
  return getModuleDefinition().setup(options, nuxt);
}

// ── Import triggers defineNuxtModule mock ────────────────────────────────────
import './module.js';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('pinflowModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureRunning.mockResolvedValue({ host: '127.0.0.1', port: 4400 });
    mockRunnerEnsureRunning.mockResolvedValue({
      running: true,
      wasStarted: true,
      provider: 'codex',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('meta', () => {
    it('should set module name to @pinflow/nuxt', () => {
      expect(getModuleDefinition().meta.name).toBe('@pinflow/nuxt');
    });

    it('should set config key to pinflow', () => {
      expect(getModuleDefinition().meta.configKey).toBe('pinflow');
    });
  });

  describe('defaults', () => {
    it('should default debug to false', () => {
      expect(getModuleDefinition().defaults.debug).toBe(false);
    });

    it('should default overlay to true', () => {
      expect(getModuleDefinition().defaults.overlay).toBe(true);
    });

    it('should default relay to empty object', () => {
      expect(getModuleDefinition().defaults.relay).toEqual({});
    });
  });

  describe('setup', () => {
    describe('dev-mode guard', () => {
      it('should skip setup in production without force-transform', async () => {
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false }, nuxt);

        expect(mockAddPlugin).not.toHaveBeenCalled();
        expect(mockAddVitePlugin).not.toHaveBeenCalled();
        expect(mockExtendWebpackConfig).not.toHaveBeenCalled();
      });

      it('should run setup in production when PINFLOW_FORCE_TRANSFORM is set', async () => {
        vi.stubEnv('PINFLOW_FORCE_TRANSFORM', '1');
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false, overlay: true, relay: {} }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalled();
        expect(mockAddVitePlugin).toHaveBeenCalled();
      });

      it('should run setup in dev mode', async () => {
        const nuxt = createMockNuxt({ dev: true });

        await callSetup({ debug: false, overlay: true, relay: {} }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalled();
      });

      it('should ignore legacy pinflow config now that pinflow is canonical', async () => {
        const nuxt = createMockNuxt({
          pinflow: {
            debug: true,
            overlay: { initialMode: 'expanded' },
            relay: { port: 3300 },
          },
        });

        await callSetup({}, nuxt);

        const [factory] = mockAddVitePlugin.mock.calls[0] as [
          () => unknown,
          Record<string, unknown>,
        ];

        factory();

        expect(mockPinFlowVitePlugin).toHaveBeenCalledWith(
          expect.objectContaining({
            relay: { autoStart: false },
            rootDir: '/test/project',
          }),
        );
      });
    });

    describe('relay auto-start', () => {
      it('should start relay with configured port and host', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          {
            debug: false,
            relay: { port: 3001, host: '0.0.0.0', bodyLimit: 5242880 },
          },
          nuxt,
        );

        expect(MockRelayControl).toHaveBeenCalledWith('/test/project');
        expect(mockEnsureRunning).toHaveBeenCalledWith({
          port: 3001,
          host: '0.0.0.0',
          bodyLimit: 5242880,
        });
      });

      it('should start relay with default options when relay is empty', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {} }, nuxt);

        expect(mockEnsureRunning).toHaveBeenCalledWith({
          port: undefined,
          host: undefined,
        });
      });

      it('should skip relay when autoStart is false', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: { autoStart: false } }, nuxt);

        expect(MockRelayControl).not.toHaveBeenCalled();
        expect(mockEnsureRunning).not.toHaveBeenCalled();
      });

      it('should handle relay startup failure gracefully', async () => {
        mockEnsureRunning.mockRejectedValue(new Error('EADDRINUSE'));
        const nuxt = createMockNuxt();

        // Should not throw
        await callSetup({ debug: false, relay: {} }, nuxt);

        // Should still register plugins
        expect(mockAddPlugin).toHaveBeenCalled();
      });

      it('should handle non-Error relay failures', async () => {
        mockEnsureRunning.mockRejectedValue('connection refused');
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {} }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalled();
      });

      it('should auto-start the configured runner after relay startup', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          {
            debug: false,
            relay: {},
            runner: { autoStart: true, provider: 'codex', model: 'gpt-5.5' },
          },
          nuxt,
        );

        expect(MockRunnerControl).toHaveBeenCalledWith('/test/project');
        expect(mockRunnerEnsureRunning).toHaveBeenCalledWith({
          relayHost: '127.0.0.1',
          relayPort: 4400,
          provider: 'codex',
          model: 'gpt-5.5',
          command: undefined,
          args: undefined,
          intervalMs: undefined,
        });
      });

      it('should auto-start the configured runner in auto mode', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          {
            debug: false,
            relay: {},
            runner: { mode: 'auto', provider: 'codex' },
          },
          nuxt,
        );

        expect(mockRunnerEnsureRunning).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'codex',
          }),
        );
      });
    });

    describe('head script injection', () => {
      it('should inject relay port and host globals when relay starts', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: false }, nuxt);

        const scripts = nuxt.options.app.head.script;
        expect(scripts.length).toBe(1);
        expect(scripts[0].innerHTML).toContain(
          'window.__PINFLOW_RELAY_PORT__=4400',
        );
        expect(scripts[0].innerHTML).toContain(
          'window.__PINFLOW_RELAY_HOST__="127.0.0.1"',
        );
      });

      it('should inject overlay options when overlay is true', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const scripts = nuxt.options.app.head.script;
        expect(scripts[0].innerHTML).toContain(
          'window.__PINFLOW_OVERLAY_OPTIONS__={}',
        );
      });

      it('should inject overlay options object when overlay is an object', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          {
            debug: false,
            relay: {},
            overlay: { initialMode: 'expanded', debug: true },
          },
          nuxt,
        );

        const scripts = nuxt.options.app.head.script;
        const innerHTML = scripts[0].innerHTML;
        expect(innerHTML).toContain('__PINFLOW_OVERLAY_OPTIONS__=');
        expect(innerHTML).toContain('"initialMode":"expanded"');
        expect(innerHTML).toContain('"debug":true');
      });

      it('should inject runtime and adapter options for the client plugin', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          {
            debug: true,
            relay: {},
            overlay: false,
            runtime: {
              phase: 2,
              redactPII: false,
              blockSelectors: ['.secret'],
            },
            capture: {
              maxTreeDepth: 12,
            },
          },
          nuxt,
        );

        const innerHTML = nuxt.options.app.head.script[0].innerHTML;
        expect(innerHTML).toContain('__PINFLOW_RUNTIME_OPTIONS__=');
        expect(innerHTML).toContain('"phase":2');
        expect(innerHTML).toContain('"redactPII":false');
        expect(innerHTML).toContain('"blockSelectors":[".secret"]');
        expect(innerHTML).toContain('__PINFLOW_ADAPTER_OPTIONS__=');
        expect(innerHTML).toContain('"maxTreeDepth":12');
        expect(innerHTML).toContain('"debug":true');
      });

      it('should not inject overlay globals when overlay is false', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: false }, nuxt);

        const scripts = nuxt.options.app.head.script;
        expect(scripts[0].innerHTML).not.toContain(
          '__PINFLOW_OVERLAY_OPTIONS__',
        );
      });

      it('should not inject any script when relay fails and overlay is false', async () => {
        mockEnsureRunning.mockRejectedValue(new Error('fail'));
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: false }, nuxt);

        expect(nuxt.options.app.head.script.length).toBe(0);
      });

      it('should join multiple globals with semicolons', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const innerHTML = nuxt.options.app.head.script[0].innerHTML;
        expect(innerHTML.split(';').length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('vite plugin registration', () => {
      it('should register vite plugin with relay autoStart disabled', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          { debug: true, relay: { port: 3001 }, overlay: true },
          nuxt,
        );

        expect(mockAddVitePlugin).toHaveBeenCalled();
        const [factory, viteOptions] = mockAddVitePlugin.mock.calls[0] as [
          () => unknown,
          Record<string, unknown>,
        ];

        // Invoke factory to check pinflow() was called correctly
        factory();
        expect(mockPinFlowVitePlugin).toHaveBeenCalledWith(
          expect.objectContaining({
            debug: true,
            overlay: true,
            rootDir: '/test/project',
            relay: { port: 3001, autoStart: false },
            runner: { mode: 'manual', autoStart: false },
          }),
        );

        // dev-only by default
        expect(viteOptions).toEqual({ dev: true });
      });

      it('should register vite plugin for all modes when force-transform is set', async () => {
        vi.stubEnv('PINFLOW_FORCE_TRANSFORM', '1');
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const [factory, viteOptions] = mockAddVitePlugin.mock.calls[0] as [
          () => Record<string, unknown>,
          Record<string, unknown>,
        ];
        const plugin = factory();

        // apply should be cleared for force-transform
        expect(plugin['apply']).toBeUndefined();
        // No dev restriction
        expect(viteOptions).toEqual({});
      });
    });

    describe('webpack plugin registration', () => {
      it('should register webpack config extension', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          { debug: true, relay: { port: 3001 }, overlay: true },
          nuxt,
        );

        expect(mockExtendWebpackConfig).toHaveBeenCalled();
      });

      it('should add webpack loader with correct options', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: true, relay: {}, overlay: true }, nuxt);

        const [configFn] = mockExtendWebpackConfig.mock.calls[0] as [
          (config: {
            module: { rules: Array<Record<string, unknown>> };
            plugins: unknown[];
          }) => void,
        ];
        const config = {
          module: { rules: [] as Array<Record<string, unknown>> },
          plugins: [] as unknown[],
        };
        configFn(config);

        expect(config.module.rules.length).toBe(1);
        const rule = config.module.rules[0];
        expect(rule['test']).toEqual(/\.(jsx|tsx|vue)$/i);
        expect(rule['exclude']).toEqual(/node_modules|\.test\.|\.spec\./i);
        expect(rule['enforce']).toBe('pre');

        const use = rule['use'] as Array<Record<string, unknown>>;
        expect(use[0]['loader']).toBe(
          '@pinflow/transform/plugins/webpack/loader',
        );
        expect(use[0]['options']).toEqual({ debug: true });
      });

      it('should use custom include/exclude patterns', async () => {
        const nuxt = createMockNuxt();
        const include = /\.vue$/;
        const exclude = /node_modules/;

        await callSetup({ debug: false, include, exclude, relay: {} }, nuxt);

        const [configFn] = mockExtendWebpackConfig.mock.calls[0] as [
          (config: {
            module: { rules: Array<Record<string, unknown>> };
            plugins: unknown[];
          }) => void,
        ];
        const config = {
          module: { rules: [] as Array<Record<string, unknown>> },
          plugins: [] as unknown[],
        };
        configFn(config);

        const rule = config.module.rules[0];
        expect(rule['test']).toBe(include);
        expect(rule['exclude']).toBe(exclude);
      });

      it('should add webpack plugin with relay autoStart disabled', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          { debug: true, relay: { port: 5000 }, overlay: true },
          nuxt,
        );

        const [configFn] = mockExtendWebpackConfig.mock.calls[0] as [
          (config: {
            module: { rules: Array<Record<string, unknown>> };
            plugins: unknown[];
          }) => void,
        ];
        const config = {
          module: { rules: [] as Array<Record<string, unknown>> },
          plugins: [] as unknown[],
        };
        configFn(config);

        expect(MockPinFlowWebpackPlugin).toHaveBeenCalledWith({
          debug: true,
          relay: { port: 5000, autoStart: false },
          runner: { mode: 'manual', autoStart: false },
          overlay: true,
        });
        expect(config.plugins.length).toBe(1);
      });

      it('should register webpack config for dev-only by default', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const [, wpOptions] = mockExtendWebpackConfig.mock.calls[0] as [
          unknown,
          Record<string, unknown>,
        ];
        expect(wpOptions).toEqual({ dev: true });
      });

      it('should register webpack config for all modes when force-transform is set', async () => {
        vi.stubEnv('PINFLOW_FORCE_TRANSFORM', '1');
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const [, wpOptions] = mockExtendWebpackConfig.mock.calls[0] as [
          unknown,
          Record<string, unknown>,
        ];
        expect(wpOptions).toEqual({});
      });
    });

    describe('runtime plugin registration', () => {
      it('should register runtime plugin as client-only', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalledWith({
          src: expect.stringContaining('runtime/plugin'),
          mode: 'client',
        });
      });

      it('should resolve plugin path via createResolver', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        expect(mockResolve).toHaveBeenCalledWith('./runtime/plugin');
      });
    });
  });
});
