import { existsSync, writeFileSync } from 'node:fs';

import * as clack from '@clack/prompts';

import { runMonorepoStep } from './monorepo-step.js';
import type { InitOptions } from './types.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  writeFileSync: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./app-detection.js', () => ({
  detectFrontendApps: vi.fn().mockReturnValue([]),
}));

vi.mock('../config-loader.js', () => ({
  findConfigFile: vi.fn(),
  loadAppRoot: vi.fn(),
}));

const { findConfigFile, loadAppRoot } = await import('../config-loader.js');
const { detectFrontendApps } = await import('./app-detection.js');

const baseOptions: InitOptions = { force: false, dryRun: false };

describe('runMonorepoStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(findConfigFile).mockReturnValue(undefined);
    vi.mocked(detectFrontendApps).mockReturnValue([]);
  });

  describe('non-interactive (--app-root flag)', () => {
    it('should write config and return resolved appRoot', async () => {
      // Arrange — app dir exists, config file does not
      vi.mocked(existsSync).mockImplementation((p) => {
        const s = String(p);
        return s === '/monorepo/apps/web'; // app root exists, config does not
      });
      const options: InitOptions = { ...baseOptions, appRoot: 'apps/web' };

      // Act
      const result = await runMonorepoStep(options, '/monorepo');

      // Assert
      expect(result.appRoot).toBe('/monorepo/apps/web');
      expect(writeFileSync).toHaveBeenCalledWith(
        '/monorepo/pinflow.config.json',
        expect.stringContaining('"appRoot": "apps/web"'),
        'utf-8',
      );
    });

    it('should exit when app root directory does not exist', async () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      const options: InitOptions = { ...baseOptions, appRoot: 'apps/missing' };

      // Act
      await runMonorepoStep(options, '/monorepo');

      // Assert
      expect(clack.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Directory not found'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('existing config', () => {
    it('should reuse existing config in manual setup when --force is not set', async () => {
      // Arrange
      vi.mocked(findConfigFile).mockReturnValue(
        '/monorepo/pinflow.config.json',
      );
      vi.mocked(loadAppRoot).mockReturnValue('/monorepo/apps/web');
      const options: InitOptions = { ...baseOptions, setupMode: 'manual' };

      // Act
      const result = await runMonorepoStep(options, '/monorepo');

      // Assert
      expect(result.appRoot).toBe('/monorepo/apps/web');
      expect(clack.confirm).not.toHaveBeenCalled();
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('should prompt when --force is set despite existing config', async () => {
      // Arrange
      vi.mocked(findConfigFile).mockReturnValue(
        '/monorepo/pinflow.config.json',
      );
      vi.mocked(clack.confirm).mockResolvedValue(false);
      const options: InitOptions = { ...baseOptions, force: true };

      // Act
      const result = await runMonorepoStep(options, '/monorepo');

      // Assert
      expect(clack.confirm).toHaveBeenCalled();
      expect(result.appRoot).toBe('/monorepo');
    });
  });

  describe('interactive mode', () => {
    it('should return cwd when user says not a monorepo', async () => {
      // Arrange
      vi.mocked(clack.confirm).mockResolvedValue(false);

      // Act
      const result = await runMonorepoStep(baseOptions, '/project');

      // Assert
      expect(result.appRoot).toBe('/project');
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('should write config and return appRoot when user provides path', async () => {
      // Arrange — app dir exists, config file does not
      vi.mocked(existsSync).mockImplementation((p) => {
        const s = String(p);
        return s === '/monorepo/apps/web';
      });
      vi.mocked(clack.confirm).mockResolvedValue(true);
      vi.mocked(clack.text).mockResolvedValue('apps/web');

      // Act
      const result = await runMonorepoStep(baseOptions, '/monorepo');

      // Assert
      expect(result.appRoot).toBe('/monorepo/apps/web');
      expect(writeFileSync).toHaveBeenCalledWith(
        '/monorepo/pinflow.config.json',
        expect.stringContaining('"appRoot": "apps/web"'),
        'utf-8',
      );
    });

    it('should exit on monorepo prompt cancel', async () => {
      // Arrange
      vi.mocked(clack.confirm).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clack.isCancel).mockReturnValueOnce(true);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      // Act
      await runMonorepoStep(baseOptions, '/project');

      // Assert
      expect(clack.cancel).toHaveBeenCalledWith('Setup cancelled.');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should exit on app root prompt cancel', async () => {
      // Arrange
      vi.mocked(clack.confirm).mockResolvedValue(true);
      vi.mocked(clack.text).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clack.isCancel)
        .mockReturnValueOnce(false) // confirm check
        .mockReturnValueOnce(true); // text check
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      // Act
      await runMonorepoStep(baseOptions, '/project');

      // Assert
      expect(clack.cancel).toHaveBeenCalledWith('Setup cancelled.');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('smart setup', () => {
    it('should show detected apps with configured status and one-app-per-run copy', async () => {
      // Arrange
      vi.mocked(detectFrontendApps).mockReturnValue([
        {
          appRoot: 'apps/admin',
          absolutePath: '/monorepo/apps/admin',
          framework: 'react-vite',
          status: 'not_configured',
          missing: ['package', 'config'],
          reason: 'dependencies "react" and "vite"',
        },
        {
          appRoot: 'apps/web',
          absolutePath: '/monorepo/apps/web',
          framework: 'next',
          status: 'configured',
          missing: [],
          reason: 'dependency "next"',
        },
      ]);
      vi.mocked(clack.select).mockResolvedValue('apps/admin');
      vi.mocked(existsSync).mockImplementation((p) => {
        const s = String(p);
        return s === '/monorepo/apps/admin';
      });

      // Act
      const result = await runMonorepoStep(baseOptions, '/monorepo');

      // Assert
      expect(result.appRoot).toBe('/monorepo/apps/admin');
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining('PinFlow sets up one app per init run'),
      );
      expect(clack.select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose one frontend app to set up or update now:',
          options: expect.arrayContaining([
            expect.objectContaining({
              label: 'apps/web',
              hint: expect.stringContaining('already set up'),
            }),
            expect.objectContaining({
              label: 'apps/admin',
              hint: expect.stringContaining('not set up'),
            }),
          ]),
        }),
      );
    });

    it('should stop --yes when multiple apps are detected', async () => {
      // Arrange
      vi.mocked(detectFrontendApps).mockReturnValue([
        {
          appRoot: 'apps/admin',
          absolutePath: '/monorepo/apps/admin',
          framework: 'react-vite',
          status: 'not_configured',
          missing: ['package', 'config'],
          reason: 'dependencies "react" and "vite"',
        },
        {
          appRoot: 'apps/web',
          absolutePath: '/monorepo/apps/web',
          framework: 'next',
          status: 'configured',
          missing: [],
          reason: 'dependency "next"',
        },
      ]);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      // Act
      await runMonorepoStep({ ...baseOptions, yes: true }, '/monorepo');

      // Assert
      expect(clack.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Multiple frontend apps found'),
      );
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining('pinflow init --yes --app-root'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('dry-run', () => {
    it('should log config content without writing', async () => {
      // Arrange — no config file on disk
      vi.mocked(existsSync).mockImplementation((p) => {
        const s = String(p);
        return s === '/monorepo/apps/web'; // only app dir exists
      });
      vi.mocked(clack.confirm).mockResolvedValue(true);
      vi.mocked(clack.text).mockResolvedValue('apps/web');
      const options: InitOptions = { ...baseOptions, dryRun: true };

      // Act
      const result = await runMonorepoStep(options, '/monorepo');

      // Assert
      expect(result.appRoot).toBe('/monorepo/apps/web');
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Would write'),
      );
    });
  });

  describe('idempotency', () => {
    it('should skip writing when config exists and --force is not set', async () => {
      // Arrange — config exists on disk, --app-root provided
      vi.mocked(existsSync).mockReturnValue(true);
      const options: InitOptions = { ...baseOptions, appRoot: 'apps/web' };

      // Act
      await runMonorepoStep(options, '/monorepo');

      // Assert
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Config already exists'),
      );
    });

    it('should overwrite when --force is set', async () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      const options: InitOptions = {
        ...baseOptions,
        force: true,
        appRoot: 'apps/web',
      };

      // Act
      await runMonorepoStep(options, '/monorepo');

      // Assert
      expect(writeFileSync).toHaveBeenCalled();
    });
  });
});
