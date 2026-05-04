import {
  isExtToWebviewMessage,
  isWebviewToExtMessage,
  type ExtToWebviewMessage,
  type WebviewToExtMessage,
} from './runs-webview-messages.js';

describe('runs-webview message guards', () => {
  describe('isExtToWebviewMessage', () => {
    it('accepts a valid runs:update', () => {
      expect(
        isExtToWebviewMessage({ type: 'runs:update', runs: [] }),
      ).toBe(true);
    });

    it('accepts a valid webview:init-ack with settings', () => {
      expect(
        isExtToWebviewMessage({
          type: 'webview:init-ack',
          runs: [],
          settings: { timeFormat: '24h' },
        }),
      ).toBe(true);
    });

    it('accepts a valid settings:update', () => {
      expect(
        isExtToWebviewMessage({
          type: 'settings:update',
          settings: { timeFormat: '12h' },
        }),
      ).toBe(true);
    });

    it('rejects an unknown type', () => {
      expect(
        isExtToWebviewMessage({ type: 'unknown:type', runs: [] }),
      ).toBe(false);
    });

    it('rejects a non-object', () => {
      expect(isExtToWebviewMessage('not an object')).toBe(false);
      expect(isExtToWebviewMessage(null)).toBe(false);
      expect(isExtToWebviewMessage(undefined)).toBe(false);
    });

    it('rejects init-ack missing settings', () => {
      expect(
        isExtToWebviewMessage({
          type: 'webview:init-ack',
          runs: [],
        }),
      ).toBe(false);
    });
  });

  describe('isWebviewToExtMessage', () => {
    it('accepts webview:ready', () => {
      expect(isWebviewToExtMessage({ type: 'webview:ready' })).toBe(true);
    });

    it('accepts run:open-prompt with runId', () => {
      expect(
        isWebviewToExtMessage({ type: 'run:open-prompt', runId: 'r_1' }),
      ).toBe(true);
    });

    it('accepts run:open-evidence-file with filePath', () => {
      expect(
        isWebviewToExtMessage({
          type: 'run:open-evidence-file',
          filePath: '/repo/.pinflow/runs/2026-04/r_1/diff.patch',
        }),
      ).toBe(true);
    });

    it('rejects run:open-prompt with missing runId', () => {
      expect(isWebviewToExtMessage({ type: 'run:open-prompt' })).toBe(false);
    });

    it('rejects run:open-evidence-file with missing filePath', () => {
      expect(
        isWebviewToExtMessage({ type: 'run:open-evidence-file' }),
      ).toBe(false);
    });

    it('rejects non-objects', () => {
      expect(isWebviewToExtMessage(null)).toBe(false);
      expect(isWebviewToExtMessage(undefined)).toBe(false);
      expect(isWebviewToExtMessage('not an object')).toBe(false);
      expect(isWebviewToExtMessage(42)).toBe(false);
    });
  });

  describe('JSON round-trip', () => {
    it('preserves all fields of init-ack', () => {
      const message: ExtToWebviewMessage = {
        type: 'webview:init-ack',
        runs: [],
        settings: { timeFormat: '24h' },
      };
      const round = JSON.parse(JSON.stringify(message)) as unknown;
      expect(isExtToWebviewMessage(round)).toBe(true);
      expect(round).toEqual(message);
    });

    it('preserves all fields of run:open-prompt', () => {
      const message: WebviewToExtMessage = {
        type: 'run:open-prompt',
        runId: 'r_1',
      };
      const round = JSON.parse(JSON.stringify(message)) as unknown;
      expect(isWebviewToExtMessage(round)).toBe(true);
      expect(round).toEqual(message);
    });
  });
});
