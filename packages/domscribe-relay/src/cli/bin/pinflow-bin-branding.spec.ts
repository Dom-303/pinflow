import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readBinSource(filename: string): string {
  return readFileSync(resolve(import.meta.dirname, filename), 'utf8');
}

describe('relay bin branding', () => {
  it('uses pinflow-relay log prefixes in the background relay process', () => {
    const processEntrySource = readBinSource('process-entry.ts');

    expect(processEntrySource).toContain('[pinflow-relay] DS_WORKSPACE_ROOT not set');
    expect(processEntrySource).toContain('[pinflow-relay] Lock file not found, shutting down...');
    expect(processEntrySource).toContain('[pinflow-relay] Shutdown complete');
    expect(processEntrySource).not.toContain('[domscribe-relay]');
  });
});
