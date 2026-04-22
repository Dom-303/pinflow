import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEGACY_BRAND = ['Dom', 'scribe'].join('');

function readBinSource(filename: string): string {
  return readFileSync(resolve(import.meta.dirname, filename), 'utf8');
}

describe('relay bin branding', () => {
  it('uses pinflow wording in the main relay cli bin comments', () => {
    const mainSource = readBinSource('main.ts');

    expect(mainSource).toContain('PinFlow CLI');
    expect(mainSource).not.toContain(LEGACY_BRAND);
  });

  it('uses the preferred pinflow command name in the mcp bin shim', () => {
    const mcpSource = readBinSource('mcp.ts');

    expect(mcpSource).toContain('The pinflow-mcp command');
    expect(mcpSource).toContain("program.parse(['npx', 'pinflow', 'mcp'");
    expect(mcpSource).not.toContain(LEGACY_BRAND);
  });

  it('uses pinflow-relay log prefixes in the background relay process', () => {
    const processEntrySource = readBinSource('process-entry.ts');

    expect(processEntrySource).toContain('[pinflow-relay] DS_WORKSPACE_ROOT not set');
    expect(processEntrySource).toContain('[pinflow-relay] Lock file not found, shutting down...');
    expect(processEntrySource).toContain('[pinflow-relay] Shutdown complete');
    expect(processEntrySource).not.toContain(LEGACY_BRAND);
  });
});
