import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('pinflow cli aliases', () => {
  it('makes pinflow the canonical cli package while keeping domscribe as an alias', () => {
    const pkg = JSON.parse(
      readRepoFile('packages/pinflow-cli/package.json'),
    ) as {
      name?: string;
      distBin?: Record<string, string>;
    };
    const aliasSource = readRepoFile('packages/pinflow-cli/src/bin/pinflow.ts');
    const compatibilitySource = readRepoFile(
      'packages/pinflow-cli/src/bin/domscribe.ts',
    );

    expect(pkg.name).toBe('pinflow');
    expect(pkg.distBin).toMatchObject({
      domscribe: './bin/domscribe.js',
      pinflow: './bin/pinflow.js',
    });
    expect(aliasSource).toContain("import { program } from '@domscribe/relay/program';");
    expect(aliasSource).toContain('program.parse();');
    expect(compatibilitySource).toContain(
      'Compatibility CLI alias for the PinFlow package identity.',
    );
  });

  it('adds a pinflow-mcp binary alias that routes through the pinflow command shape', () => {
    const pkg = JSON.parse(
      readRepoFile('packages/pinflow-mcp/package.json'),
    ) as {
      name?: string;
      distBin?: Record<string, string>;
    };
    const aliasSource = readRepoFile(
      'packages/pinflow-mcp/src/bin/pinflow-mcp.ts',
    );

    expect(pkg.name).toBe('@pinflow/mcp');
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
