import { existsSync, statSync } from 'node:fs';

import { getWorkspaceRoot } from './utils.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ isDirectory: () => true }),
}));

vi.mock('./config-loader.js', () => ({
  findConfigFile: vi.fn(),
  loadAppRoot: vi.fn(),
}));

// Import after mocking so we get the mocked versions
const { findConfigFile, loadAppRoot } = await import('./config-loader.js');

describe('getWorkspaceRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cwd when .pinflow exists there', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(true);

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe(process.cwd());
  });

  it('should resolve appRoot from config at cwd when workspace dir is absent', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(findConfigFile).mockReturnValueOnce(
      '/monorepo/pinflow.config.json',
    );
    vi.mocked(loadAppRoot).mockReturnValueOnce('/monorepo/apps/web');

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe('/monorepo/apps/web');
  });

  it('should prefer .pinflow at cwd over config file', () => {
    // Arrange — .pinflow exists at cwd
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('.pinflow'),
    );

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe(process.cwd());
    // Config loader should not be consulted when .pinflow is found directly
    expect(loadAppRoot).not.toHaveBeenCalled();
  });

  it('should walk up and find .pinflow in parent directory', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) => {
      const str = String(p);
      return str === '/.pinflow';
    });
    vi.mocked(findConfigFile).mockReturnValue(undefined);
    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => true,
    } as ReturnType<typeof statSync>);

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe('/');
  });

  it('should walk up and find config in parent directory', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => true,
    } as ReturnType<typeof statSync>);

    // findConfigFile: no config at cwd, then found at root
    vi.mocked(findConfigFile)
      .mockReturnValueOnce(undefined) // step 2: cwd
      .mockImplementation((dir) =>
        dir === '/' ? '/pinflow.config.json' : undefined,
      );
    vi.mocked(loadAppRoot).mockReturnValue('/apps/web');

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe('/apps/web');
  });

  it('should return undefined when no workspace dir or config is found', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(findConfigFile).mockReturnValue(undefined);

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBeUndefined();
  });

  it('should ignore unrelated directories that only resemble .pinflow', () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('.legacy-pinflow'),
    );

    const result = getWorkspaceRoot();

    expect(result).toBeUndefined();
  });
});
