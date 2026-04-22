import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('pinflow preferred cli docs', () => {
  it('documents pinflow as the preferred installed command while keeping domscribe init as the compatibility path', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('Preferred installed CLI command: `pinflow`');
    expect(readme).toContain('Current no-install compatibility path: `npx domscribe init`');
    expect(readme).toContain('Compatibility alias: `domscribe`');
  });

  it('documents pinflow-mcp as the preferred installed binary while keeping compatibility aliases available', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('Preferred installed MCP binary: `pinflow-mcp`');
    expect(readme).toContain('Preferred MCP server key: `pinflow`');
    expect(readme).toContain('"args": ["-y", "@pinflow/mcp"]');
    expect(readme).toContain(
      'Compatibility aliases remain available for older `domscribe.*` MCP clients',
    );
  });
});
