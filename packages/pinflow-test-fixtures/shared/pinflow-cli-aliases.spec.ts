import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('pinflow cli aliases', () => {
  it('uses pinflow as the canonical cli package entrypoint', () => {
    const pkg = JSON.parse(
      readRepoFile('packages/pinflow-cli/package.json'),
    ) as {
      name?: string;
      distBin?: Record<string, string>;
    };
    const entrySource = readRepoFile('packages/pinflow-cli/src/bin/pinflow.ts');

    expect(pkg.name).toBe('pinflow');
    expect(pkg.distBin).toEqual({
      pinflow: './bin/pinflow.js',
    });
    expect(entrySource).toContain(
      "import { program } from '@pinflow/relay/program';",
    );
    expect(entrySource).toContain('program.parse();');
  });

  it('uses pinflow-mcp as the canonical mcp package entrypoint', () => {
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
    expect(pkg.distBin).toEqual({
      'pinflow-mcp': './bin/pinflow-mcp.js',
    });
    expect(aliasSource).toContain("import { program } from '@pinflow/relay/program';");
    expect(aliasSource).toContain(
      "program.parse(['npx', 'pinflow', 'mcp', ...process.argv.slice(2)]);",
    );
  });
});
