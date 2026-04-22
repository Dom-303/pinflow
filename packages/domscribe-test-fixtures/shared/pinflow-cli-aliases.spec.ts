import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('pinflow cli aliases', () => {
  it('adds a pinflow binary alias alongside domscribe', () => {
    const pkg = JSON.parse(
      readRepoFile('packages/domscribe-cli/package.json'),
    ) as {
      distBin?: Record<string, string>;
    };
    const aliasSource = readRepoFile('packages/domscribe-cli/src/bin/pinflow.ts');

    expect(pkg.distBin).toMatchObject({
      domscribe: './bin/domscribe.js',
      pinflow: './bin/pinflow.js',
    });
    expect(aliasSource).toContain("import { program } from '@domscribe/relay/program';");
    expect(aliasSource).toContain('program.parse();');
  });

  it('adds a pinflow-mcp binary alias that routes through the pinflow command shape', () => {
    const pkg = JSON.parse(
      readRepoFile('packages/domscribe-mcp/package.json'),
    ) as {
      distBin?: Record<string, string>;
    };
    const aliasSource = readRepoFile(
      'packages/domscribe-mcp/src/bin/pinflow-mcp.ts',
    );

    expect(pkg.distBin).toMatchObject({
      'domscribe-mcp': './bin/domscribe-mcp.js',
      'pinflow-mcp': './bin/pinflow-mcp.js',
    });
    expect(aliasSource).toContain("import { program } from '@domscribe/relay/program';");
    expect(aliasSource).toContain(
      "program.parse(['npx', 'pinflow', 'mcp', ...process.argv.slice(2)]);",
    );
  });
});
