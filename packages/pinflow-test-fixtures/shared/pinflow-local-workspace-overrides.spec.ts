import { describe, expect, it } from 'vitest';
import {
  pinflowLocalPreviewViteConfig,
  rewritePinflowInitImports,
} from './pinflow-local-workspace-overrides.js';

describe('rewritePinflowInitImports', () => {
  it('rewrites html-level overlay and react init imports to local workspace modules', () => {
    const source = [
      "<script type=\"module\">import('/@pinflow/overlay-init.js?v=stale');</script>",
      "<script type=\"module\">import('/@pinflow/react-init.js?v=older');</script>",
    ].join('\n');

    const result = rewritePinflowInitImports(source, 'pinflow-ui-test');

    expect(result).toContain(
      "import('/pinflow-local-overlay-init.ts?v=pinflow-ui-test');",
    );
    expect(result).toContain(
      "import('/pinflow-local-react-init.ts?v=pinflow-ui-test');",
    );
    expect(result).not.toContain('/@pinflow/overlay-init.js');
    expect(result).not.toContain('/@pinflow/react-init.js');
  });

  it('rewrites transformed source preambles that use double-quoted init imports', () => {
    const source = [
      `if(typeof window!=='undefined'&&!window.__PINFLOW_REACT_INIT__){window.__PINFLOW_REACT_INIT__=true;import("/@pinflow/react-init.js?v=pinflow-ui-2026-04-23b").catch(function(){})}`,
      `import("/@pinflow/overlay-init.js?v=pinflow-ui-2026-04-23b").catch(function(){})`,
    ].join('\n');

    const result = rewritePinflowInitImports(source, 'pinflow-ui-test');

    expect(result).toContain(
      `import('/pinflow-local-react-init.ts?v=pinflow-ui-test').catch(function(){})`,
    );
    expect(result).toContain(
      `import('/pinflow-local-overlay-init.ts?v=pinflow-ui-test').catch(function(){})`,
    );
  });
});

describe('pinflowLocalPreviewViteConfig', () => {
  it('disables preserveSymlinks so pnpm peer resolution works', () => {
    const config = pinflowLocalPreviewViteConfig();

    expect(config.resolve.preserveSymlinks).toBe(false);
  });

  it('forces esbuild to use legacy decorators for lit @customElement', () => {
    const config = pinflowLocalPreviewViteConfig();

    expect(config.esbuild.tsconfigRaw.compilerOptions.experimentalDecorators).toBe(true);
    expect(config.esbuild.tsconfigRaw.compilerOptions.useDefineForClassFields).toBe(false);
  });

  it('excludes workspace + lit packages from prebundling', () => {
    const config = pinflowLocalPreviewViteConfig();

    expect(config.optimizeDeps.exclude).toEqual(
      expect.arrayContaining([
        '@pinflow/core',
        '@pinflow/runtime',
        '@pinflow/react',
        '@pinflow/relay',
        '@pinflow/manifest',
        '@pinflow/overlay',
        'lit',
        'lit-html',
        'lit/decorators.js',
        '@lit/reactive-element',
      ]),
    );
  });
});
