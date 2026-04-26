import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('pinflow preferred cli docs', () => {
  it('documents pinflow as the preferred installed command while keeping pinflow init as the compatibility path', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('Bevorzugter installierter CLI-Befehl: `pinflow`');
    expect(readme).toContain('Kompatibler');
    expect(readme).toContain('No-Install-Pfad: `npx pinflow init`');
    expect(readme).toContain('Kompatibilitaets-Alias: `pinflow`');
  });

  it('documents pinflow-mcp as the preferred installed binary while keeping compatibility aliases available', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('Bevorzugtes installiertes MCP-Binary: `pinflow-mcp`');
    expect(readme).toContain('Bevorzugter');
    expect(readme).toContain('MCP-Server-Key:');
    expect(readme).toContain('`pinflow`');
    expect(readme).toContain(
      '"args": ["-y", "--package", "@pinflow/mcp", "pinflow-mcp"]',
    );
    expect(readme).toContain('Kompatibilitaets-Aliasse bleiben');
    expect(readme).toContain('`pinflow.*`-MCP-Clients verfuegbar');
  });
});
