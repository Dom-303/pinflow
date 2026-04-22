import { readFileSync, writeFileSync } from 'node:fs';

import * as clack from '@clack/prompts';

import { runGitignoreStep } from './gitignore-step.js';
import type { InitOptions } from './types.js';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  log: {
    info: vi.fn(),
    success: vi.fn(),
  },
}));

const baseOptions: InitOptions = { force: false, dryRun: false };

describe('runGitignoreStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create .gitignore when it does not exist', () => {
    // Arrange
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    // Act
    runGitignoreStep(baseOptions, '/project');

    // Assert
    expect(writeFileSync).toHaveBeenCalledWith(
      '/project/.gitignore',
      '# PinFlow artifacts\n.pinflow\n',
      'utf-8',
    );
    expect(clack.log.success).toHaveBeenCalledWith(
      'Created .pinflow to .gitignore',
    );
  });

  it('should append to existing .gitignore that lacks the entry', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue('node_modules\ndist\n');

    // Act
    runGitignoreStep(baseOptions, '/project');

    // Assert
    expect(writeFileSync).toHaveBeenCalledWith(
      '/project/.gitignore',
      'node_modules\ndist\n\n# PinFlow artifacts\n.pinflow\n',
      'utf-8',
    );
    expect(clack.log.success).toHaveBeenCalledWith(
      'Added .pinflow to .gitignore',
    );
  });

  it('should add a newline separator when file does not end with one', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue('node_modules');

    // Act
    runGitignoreStep(baseOptions, '/project');

    // Assert
    expect(writeFileSync).toHaveBeenCalledWith(
      '/project/.gitignore',
      'node_modules\n\n# PinFlow artifacts\n.pinflow\n',
      'utf-8',
    );
  });

  it('should skip when .pinflow is already present', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue('node_modules\n.pinflow\n');

    // Act
    runGitignoreStep(baseOptions, '/project');

    // Assert
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(clack.log.info).toHaveBeenCalledWith(
      '.gitignore already contains .pinflow',
    );
  });

  it('should skip when .pinflow/ (with trailing slash) is present', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue('.pinflow/\n');

    // Act
    runGitignoreStep(baseOptions, '/project');

    // Assert
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(clack.log.info).toHaveBeenCalledWith(
      '.gitignore already contains .pinflow',
    );
  });

  describe('dry-run', () => {
    const dryRunOptions: InitOptions = { ...baseOptions, dryRun: true };

    it('should log without writing when file does not exist', () => {
      // Arrange
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      // Act
      runGitignoreStep(dryRunOptions, '/project');

      // Assert
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith(
        'Would create .gitignore with .pinflow',
      );
    });

    it('should log without writing when file exists but lacks entry', () => {
      // Arrange
      vi.mocked(readFileSync).mockReturnValue('node_modules\n');

      // Act
      runGitignoreStep(dryRunOptions, '/project');

      // Assert
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith(
        'Would append to .gitignore with .pinflow',
      );
    });
  });
});
