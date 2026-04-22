import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relativePath: string): string {
  return readFileSync(resolve(import.meta.dirname, relativePath), 'utf8');
}

describe('pinflow relay branding', () => {
  it('uses PinFlow error types across the active relay server surfaces', () => {
    const serverTypes = readSource('./server/types.ts');
    const healthRoute = readSource('./server/routes/health.route.ts');
    const httpServer = readSource('./server/http-server.ts');

    expect(serverTypes).toContain('PinFlowErrorCode');
    expect(serverTypes).not.toContain('DomscribeErrorCode');
    expect(healthRoute).toContain('PinFlowError');
    expect(healthRoute).toContain('PinFlowErrorCode');
    expect(httpServer).toContain('PinFlowErrorCode');
  });

  it('uses pinflow-relay log prefixes in relay runtime files', () => {
    const httpServer = readSource('./server/http-server.ts');
    const wsServer = readSource('./server/ws-server.ts');
    const wsClient = readSource('./client/relay-ws-client.ts');

    expect(httpServer).toContain('[pinflow-relay]');
    expect(httpServer).not.toContain('[domscribe-relay]');
    expect(wsServer).toContain('[pinflow-relay][ws]');
    expect(wsServer).not.toContain('[domscribe-relay][ws]');
    expect(wsClient).toContain('[pinflow-relay][ws-client]');
    expect(wsClient).not.toContain('[domscribe-relay][ws-client]');
  });
});
