/**
 * Vue-aware PinFlow Vite plugin
 * @module @pinflow/vue/vite/vite-plugin
 */
import type { Plugin, IndexHtmlTransformResult, HtmlTagDescriptor } from 'vite';
import { pinflow as basePinFlow } from '@pinflow/transform/plugins/vite';
import type { PinFlowVuePluginOptions } from './types.js';

/**
 * URL path for the virtual init module.
 *
 * When the browser fetches this path, Vite's dev server routes it through
 * the plugin pipeline (resolveId → load → transform). The transform step
 * rewrites bare specifiers (`@pinflow/runtime`, `@pinflow/vue`) to
 * pre-bundled paths — the same ones the overlay resolves to internally —
 * so RuntimeManager shares a single singleton across all consumers.
 *
 * Direct `/node_modules/` paths bypass pre-bundling and create separate
 * module instances with separate singletons, which breaks runtime capture.
 */
const INIT_MODULE_BASE_PATH = '/@pinflow/vue-init.js';
const PINFLOW_DEV_CACHE_TAG = 'pinflow-ui-2026-04-23b';
const INIT_MODULE_PATH = `${INIT_MODULE_BASE_PATH}?v=${PINFLOW_DEV_CACHE_TAG}`;

function isInitModuleRequest(id: string): boolean {
  return (
    id === INIT_MODULE_BASE_PATH || id.startsWith(`${INIT_MODULE_BASE_PATH}?`)
  );
}

/**
 * PinFlow Vite plugin for Vue projects.
 *
 * Creates the base transform plugin internally and adds RuntimeManager + VueAdapter
 * initialization via a virtual module. No entrypoint changes needed.
 *
 * @remarks
 * For framework-agnostic usage (no runtime capture), import `pinflow`
 * from `@pinflow/transform/plugins/vite` directly.
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import vue from '@vitejs/plugin-vue'
 * import { pinflow } from '@pinflow/vue/vite'
 *
 * export default defineConfig({
 *   plugins: [vue(), pinflow({ overlay: true })]
 * })
 * ```
 */
export function pinflow(options?: PinFlowVuePluginOptions): Plugin {
  const basePlugin = basePinFlow(options);
  const baseTransformIndexHtml = basePlugin.transformIndexHtml;
  const baseTransform = basePlugin.transform;
  const baseResolveId =
    typeof basePlugin.resolveId === 'function' ? basePlugin.resolveId : null;
  const baseLoad =
    typeof basePlugin.load === 'function' ? basePlugin.load : null;

  basePlugin.name = 'vite-plugin-pinflow-vue';

  basePlugin.resolveId = function (id, ...args) {
    if (isInitModuleRequest(id)) {
      return INIT_MODULE_PATH;
    }
    return baseResolveId?.call(this, id, ...args) ?? null;
  };

  basePlugin.load = function (id, ...args) {
    if (isInitModuleRequest(id)) {
      const rt = options?.runtime ?? {};
      const cap = options?.capture ?? {};
      const debug = options?.debug ?? false;

      // Bare specifiers here get rewritten by Vite's transform pipeline
      // to pre-bundled paths, matching what the overlay resolves internally
      return [
        `import { RuntimeManager } from '@pinflow/runtime';`,
        `import { createVueAdapter } from '@pinflow/vue';`,
        ``,
        `RuntimeManager.getInstance().initialize({`,
        `  phase: ${rt.phase ?? 1},`,
        `  debug: ${debug},`,
        `  redactPII: ${rt.redactPII ?? true},`,
        `  blockSelectors: ${JSON.stringify(rt.blockSelectors ?? [])},`,
        `  adapter: createVueAdapter({`,
        `    maxTreeDepth: ${cap.maxTreeDepth ?? 50},`,
        `    debug: ${debug},`,
        `  }),`,
        `}).catch(e => console.warn('[pinflow] Failed to init Vue runtime:', e.message));`,
      ].join('\n');
    }
    return baseLoad?.call(this, id, ...args) ?? null;
  };

  basePlugin.transform = async function (code, sourceFile) {
    const baseTransformFn =
      typeof baseTransform === 'function' ? baseTransform : undefined;
    const baseResult = baseTransformFn
      ? await baseTransformFn.call(this, code, sourceFile)
      : null;

    if (
      !baseResult ||
      typeof baseResult !== 'object' ||
      !('code' in baseResult)
    ) {
      return baseResult;
    }

    // In SSR-style Vue setups, index.html injection may not run. This guarded
    // preamble keeps runtime capture available without changing project files.
    const vueInitPreamble =
      `if(typeof window!=='undefined'&&!window.__PINFLOW_VUE_INIT__){` +
      `window.__PINFLOW_VUE_INIT__=true;` +
      `import('${INIT_MODULE_PATH}').catch(function(){})` +
      `}\n`;

    return {
      ...baseResult,
      code: vueInitPreamble + baseResult.code,
    };
  };

  basePlugin.transformIndexHtml = (): IndexHtmlTransformResult => {
    // Call the base plugin's transformIndexHtml (relay port + overlay injection)
    const baseResult =
      typeof baseTransformIndexHtml === 'function'
        ? (
            baseTransformIndexHtml as () => IndexHtmlTransformResult | undefined
          )()
        : undefined;

    // Build on existing tags from the base plugin
    const baseTags: HtmlTagDescriptor[] =
      baseResult && typeof baseResult === 'object' && 'tags' in baseResult
        ? (baseResult.tags ?? [])
        : [];

    // Import the virtual init module — browser fetches this URL, Vite
    // serves it through its full plugin + transform pipeline
    const runtimeTag: HtmlTagDescriptor = {
      tag: 'script',
      attrs: { type: 'module' },
      children: `import('${INIT_MODULE_PATH}');`,
      injectTo: 'body',
    };

    const tags = [...baseTags, runtimeTag];
    return { html: '', tags };
  };

  return basePlugin;
}
