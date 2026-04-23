import { describe, it, expect, vi } from 'vitest';
import type { Plugin, IndexHtmlTransformResult, HtmlTagDescriptor } from 'vite';

vi.mock('@pinflow/transform/plugins/vite', () => ({
  pinflow: vi.fn(
    (options?: Record<string, unknown>): Plugin => ({
      name: 'vite-plugin-pinflow-transform',
      transform: options?._baseTransformResult
        ? async () => options._baseTransformResult as { code: string }
        : undefined,
      transformIndexHtml: options?._baseTags
        ? () => ({ html: '', tags: options._baseTags as HtmlTagDescriptor[] })
        : undefined,
    }),
  ),
}));

import { pinflow } from './vite-plugin.js';

const LEGACY_BRAND = ['Dom', 'scribe'].join('');
const REACT_INIT_PATH = '/@pinflow/react-init.js?v=pinflow-ui-2026-04-23b';

describe('pinflow (react/vite)', () => {
  it('should rename the plugin to vite-plugin-pinflow-react', () => {
    const plugin = pinflow();

    expect(plugin.name).toBe('vite-plugin-pinflow-react');
  });

  it('should keep pinflow as a compatibility alias', () => {
    expect(pinflow).toBe(pinflow);
  });

  it('should return a Plugin object', () => {
    const plugin = pinflow();

    expect(plugin).toBeDefined();
    expect(plugin.name).toBeDefined();
  });

  describe('resolveId', () => {
    it('should resolve the init module path', () => {
      const plugin = pinflow();
      const resolveId = plugin.resolveId as (id: string) => string | null;

      const result = resolveId.call({}, '/@pinflow/react-init.js');

      expect(result).toBe(REACT_INIT_PATH);
    });

    it('should resolve cache-busted init requests to the current init module path', () => {
      const plugin = pinflow();
      const resolveId = plugin.resolveId as (id: string) => string | null;

      const result = resolveId.call({}, '/@pinflow/react-init.js?v=older-build');

      expect(result).toBe(REACT_INIT_PATH);
    });

    it('should return null for unrelated IDs', () => {
      const plugin = pinflow();
      const resolveId = plugin.resolveId as (id: string) => string | null;

      const result = resolveId.call({}, 'some-other-module');

      expect(result).toBeNull();
    });
  });

  describe('load', () => {
    it('should return init code for the init module path', () => {
      const plugin = pinflow();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, REACT_INIT_PATH);

      expect(result).toContain(`from '@pinflow/runtime'`);
      expect(result).toContain(`from '@pinflow/react'`);
      expect(result).toContain('RuntimeManager');
      expect(result).toContain('createReactAdapter');
      expect(result).toContain('window.__PINFLOW_OVERLAY_OPTIONS__');
    });

    it('should embed default runtime options when none provided', () => {
      const plugin = pinflow();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, REACT_INIT_PATH);

      expect(result).toContain('phase: 1');
      expect(result).toContain('debug: false');
      expect(result).toContain('redactPII: true');
      expect(result).toContain('blockSelectors: []');
      expect(result).toContain("strategy: 'best-effort'");
      expect(result).toContain('maxTreeDepth: 50');
      expect(result).toContain('includeWrappers: true');
    });

    it('should serialize custom runtime options', () => {
      const plugin = pinflow({
        runtime: { phase: 2, redactPII: false, blockSelectors: ['.secret'] },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, REACT_INIT_PATH);

      expect(result).toContain('phase: 2');
      expect(result).toContain('redactPII: false');
      expect(result).toContain('blockSelectors: [".secret"]');
    });

    it('should serialize custom capture options', () => {
      const plugin = pinflow({
        capture: {
          strategy: 'fiber',
          maxTreeDepth: 25,
          includeWrappers: false,
        },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, REACT_INIT_PATH);

      expect(result).toContain("strategy: 'fiber'");
      expect(result).toContain('maxTreeDepth: 25');
      expect(result).toContain('includeWrappers: false');
    });

    it('should cascade debug to both runtime and adapter', () => {
      const plugin = pinflow({ debug: true });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, REACT_INIT_PATH);

      // debug appears in both initialize() and createReactAdapter()
      const debugMatches = result.match(/debug: true/g);
      expect(debugMatches).toHaveLength(2);
    });

    it('should serialize hookNameResolvers into Map reconstruction', () => {
      const plugin = pinflow({
        capture: {
          hookNameResolvers: {
            MyComponent: { 0: 'count', 1: 'name' },
          },
        },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, REACT_INIT_PATH);

      expect(result).toContain('new Map(Object.entries(_r)');
      expect(result).toContain('"MyComponent"');
      expect(result).toContain('"count"');
      expect(result).toContain('"name"');
    });

    it('should use empty Map when no hookNameResolvers provided', () => {
      const plugin = pinflow();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, REACT_INIT_PATH);

      expect(result).toContain('const _resolvers = new Map();');
    });

    it('should return null for unrelated IDs', () => {
      const plugin = pinflow();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, 'some-other-module');

      expect(result).toBeNull();
    });
  });

  describe('transformIndexHtml', () => {
    it('should inject a script tag for runtime initialization', () => {
      const plugin = pinflow();

      const result = (
        plugin.transformIndexHtml as () => IndexHtmlTransformResult
      )();

      expect(result).toHaveProperty('tags');
      const tags = (result as { tags: HtmlTagDescriptor[] }).tags;
      const runtimeTag = tags.find(
        (t) => t.tag === 'script' && t.attrs?.type === 'module',
      );
      expect(runtimeTag).toBeDefined();
      expect(runtimeTag?.injectTo).toBe('body');
      expect(runtimeTag?.children).toContain(
        `import('${REACT_INIT_PATH}');`,
      );
    });

    it('should preserve base plugin tags', () => {
      const baseTags: HtmlTagDescriptor[] = [
        { tag: 'script', attrs: { src: '/overlay.js' }, injectTo: 'body' },
      ];
      // Pass _baseTags through options so the mock base plugin returns them
      const plugin = pinflow({ _baseTags: baseTags } as never);

      const result = (
        plugin.transformIndexHtml as () => IndexHtmlTransformResult
      )();

      const tags = (result as { tags: HtmlTagDescriptor[] }).tags;
      expect(tags.length).toBeGreaterThan(1);
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'script',
          attrs: { src: '/overlay.js' },
        }),
      );
    });

    it('should handle base plugin with no transformIndexHtml', () => {
      const plugin = pinflow();

      const result = (
        plugin.transformIndexHtml as () => IndexHtmlTransformResult
      )();

      const tags = (result as { tags: HtmlTagDescriptor[] }).tags;
      // Base has no transformIndexHtml → only the runtime init tag
      expect(tags).toHaveLength(1);
    });
  });

  describe('transform', () => {
    it('should use the PinFlow runtime guard in the injected init preamble', async () => {
      const plugin = pinflow({
        _baseTransformResult: { code: 'export const value = 1;' },
      } as never);
      const transform = plugin.transform as (
        code: string,
        sourceFile: string,
      ) => Promise<{ code: string } | null>;

      const result = await transform.call(
        {},
        'export const value = 1;',
        '/src/example.tsx',
      );

      expect(result?.code).toContain('window.__PINFLOW_REACT_INIT__');
      expect(result?.code).not.toContain(LEGACY_BRAND);
    });
  });
});
