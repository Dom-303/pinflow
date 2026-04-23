import { describe, expect, it } from 'vitest';
import { rewritePinflowInitImports } from './pinflow-local-workspace-overrides.js';

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
