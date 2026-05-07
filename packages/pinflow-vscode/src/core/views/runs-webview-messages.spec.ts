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
        isExtToWebviewMessage({
          type: 'runs:update',
          runsByFolder: {},
          folderStatuses: {},
        }),
      ).toBe(true);
    });

    it('accepts a valid webview:init-ack with settings', () => {
      expect(
        isExtToWebviewMessage({
          type: 'webview:init-ack',
          runsByFolder: {},
          folderStatuses: {},
          settings: { timeFormat: '24h' },
        }),
      ).toBe(true);
    });

    it('accepts a valid webview:init-ack with activeFolder', () => {
      expect(
        isExtToWebviewMessage({
          type: 'webview:init-ack',
          runsByFolder: {},
          folderStatuses: { '/folder/path': 'configured' },
          activeFolder: '/folder/path',
          settings: { timeFormat: '24h' },
        }),
      ).toBe(true);
    });

    it('rejects runs:update with old runs array shape', () => {
      expect(
        isExtToWebviewMessage({ type: 'runs:update', runs: [] }),
      ).toBe(false);
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
        isExtToWebviewMessage({ type: 'unknown:type', runsByFolder: {} }),
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
          runsByFolder: {},
          folderStatuses: {},
        }),
      ).toBe(false);
    });
  });

  describe('isExtToWebviewMessage with folderStatuses', () => {
    it('accepts runs:update with folderStatuses', () => {
      // Arrange
      const msg = {
        type: 'runs:update',
        runsByFolder: { '/a': [] },
        folderStatuses: { '/a': 'configured' },
      };

      // Act + Assert
      expect(isExtToWebviewMessage(msg)).toBe(true);
    });

    it('rejects runs:update without folderStatuses', () => {
      // Arrange + Act + Assert
      expect(
        isExtToWebviewMessage({
          type: 'runs:update',
          runsByFolder: { '/a': [] },
        }),
      ).toBe(false);
    });

    it('rejects folderStatuses with invalid status value', () => {
      // Arrange + Act + Assert
      expect(
        isExtToWebviewMessage({
          type: 'runs:update',
          runsByFolder: { '/a': [] },
          folderStatuses: { '/a': 'wrong' },
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

  describe('isWebviewToExtMessage with run-init', () => {
    it('accepts webview:run-init with folder', () => {
      // Arrange + Act + Assert
      expect(
        isWebviewToExtMessage({ type: 'webview:run-init', folder: '/a' }),
      ).toBe(true);
    });

    it('rejects webview:run-init without folder', () => {
      // Arrange + Act + Assert
      expect(isWebviewToExtMessage({ type: 'webview:run-init' })).toBe(false);
    });
  });

  describe('isExtToWebviewMessage — 4B additions', () => {
    it('accepts transcript:initial with runId, text, isLive', () => {
      expect(
        isExtToWebviewMessage({
          type: 'transcript:initial',
          runId: 'r_1',
          text: 'hello',
          isLive: true,
        }),
      ).toBe(true);
    });

    it('rejects transcript:initial without isLive flag', () => {
      expect(
        isExtToWebviewMessage({
          type: 'transcript:initial',
          runId: 'r_1',
          text: 'hello',
        }),
      ).toBe(false);
    });

    it('accepts transcript:append with runId and delta', () => {
      expect(
        isExtToWebviewMessage({ type: 'transcript:append', runId: 'r_1', delta: 'next' }),
      ).toBe(true);
    });

    it('accepts diff:update with array changedFiles', () => {
      expect(
        isExtToWebviewMessage({ type: 'diff:update', runId: 'r_1', changedFiles: [] }),
      ).toBe(true);
    });

    it('rejects diff:update with non-array changedFiles', () => {
      expect(
        isExtToWebviewMessage({ type: 'diff:update', runId: 'r_1', changedFiles: {} }),
      ).toBe(false);
    });
  });

  describe('isWebviewToExtMessage — 4B additions', () => {
    it('accepts run:expand with runId', () => {
      expect(isWebviewToExtMessage({ type: 'run:expand', runId: 'r_1' })).toBe(true);
    });

    it('accepts run:collapse with runId', () => {
      expect(isWebviewToExtMessage({ type: 'run:collapse', runId: 'r_1' })).toBe(true);
    });

    it('accepts run:open-diff with runId and filePath', () => {
      expect(
        isWebviewToExtMessage({
          type: 'run:open-diff',
          runId: 'r_1',
          filePath: 'src/foo.ts',
        }),
      ).toBe(true);
    });

    it('rejects run:open-diff without filePath', () => {
      expect(
        isWebviewToExtMessage({ type: 'run:open-diff', runId: 'r_1' }),
      ).toBe(false);
    });
  });

  describe('JSON round-trip', () => {
    it('preserves all fields of init-ack', () => {
      const message: ExtToWebviewMessage = {
        type: 'webview:init-ack',
        runsByFolder: { '/workspace/project': [] },
        folderStatuses: { '/workspace/project': 'configured' },
        activeFolder: '/workspace/project',
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

    it('preserves folderStatuses in runs:update round-trip', () => {
      // Arrange
      const message: ExtToWebviewMessage = {
        type: 'runs:update',
        runsByFolder: { '/a': [], '/b': [] },
        folderStatuses: { '/a': 'configured', '/b': 'not-configured' },
        activeFolder: '/a',
      };

      // Act
      const round = JSON.parse(JSON.stringify(message)) as unknown;

      // Assert
      expect(isExtToWebviewMessage(round)).toBe(true);
      expect(round).toEqual(message);
    });
  });
});
