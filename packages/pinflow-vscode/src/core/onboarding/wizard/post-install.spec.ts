/**
 * Tests for the post-install agent-plugin flow.
 * @module
 */
import { describe, it, expect, vi } from 'vitest';

import { runPostInstall, getInstallCommands } from './post-install.js';

describe('getInstallCommands', () => {
  it('returns one command for codex (marketplace step dropped, mcp add only)', () => {
    const cmds = getInstallCommands('codex');
    expect(cmds).toEqual([
      'codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
    ]);
  });

  it('returns two commands for claude-code', () => {
    const cmds = getInstallCommands('claude-code');
    expect(cmds).toBeDefined();
    expect(cmds?.length).toBe(2);
  });

  it('returns undefined for copilot', () => {
    expect(getInstallCommands('copilot')).toBeUndefined();
  });

  it('returns undefined for other', () => {
    expect(getInstallCommands('other')).toBeUndefined();
  });
});

describe('runPostInstall', () => {
  function makeDeps(pickedAction: string | undefined) {
    const showInformationMessage = vi.fn().mockResolvedValue(pickedAction);
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    const runInstallInTerminal = vi.fn();
    return { showInformationMessage, clipboardWriteText, runInstallInTerminal };
  }

  it("'Install' triggers runInstallInTerminal with codex commands and agent label", async () => {
    // Arrange
    const deps = makeDeps('Install');

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.runInstallInTerminal).toHaveBeenCalledOnce();
    expect(deps.runInstallInTerminal).toHaveBeenCalledWith(
      '/projects/myapp',
      ['codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp'],
      'Codex',
    );
  });

  it('toast prompt uses install/show/skip wording', async () => {
    // Arrange
    const deps = makeDeps('Skip');

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    const [msg, ...actions] = deps.showInformationMessage.mock.calls[0] as [string, ...string[]];
    expect(msg).toBe('PinFlow is set up in myapp. Install the Codex plugin?');
    expect(actions).toEqual(['Install', 'Show command', 'Skip']);
  });

  it("'Show command' copies command and shows confirmation toast", async () => {
    // Arrange
    const deps = makeDeps('Show command');
    deps.showInformationMessage
      .mockResolvedValueOnce('Show command')
      .mockResolvedValueOnce(undefined);

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.clipboardWriteText).toHaveBeenCalledWith(
      'codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
    );
    const secondCall = deps.showInformationMessage.mock.calls[1];
    expect(secondCall[0]).toBe('Codex install command copied to clipboard.');
  });

  it("'Skip' returns without calling terminal or clipboard", async () => {
    // Arrange
    const deps = makeDeps('Skip');

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.runInstallInTerminal).not.toHaveBeenCalled();
    expect(deps.clipboardWriteText).not.toHaveBeenCalled();
  });

  it("agent='copilot' shows plain success toast, no choice prompt", async () => {
    // Arrange
    const deps = makeDeps(undefined);

    // Act
    await runPostInstall('copilot', '/projects/copilot-folder', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.showInformationMessage).toHaveBeenCalledOnce();
    const [msg, ...actions] = deps.showInformationMessage.mock.calls[0] as [string, ...string[]];
    expect(msg).toBe('PinFlow is set up in copilot-folder.');
    expect(actions).toHaveLength(0);
    expect(deps.runInstallInTerminal).not.toHaveBeenCalled();
  });

  it("agent='other' shows plain success toast, no choice prompt", async () => {
    // Arrange
    const deps = makeDeps(undefined);

    // Act
    await runPostInstall('other', '/projects/other-folder', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.showInformationMessage).toHaveBeenCalledOnce();
    const [msg, ...actions] = deps.showInformationMessage.mock.calls[0] as [string, ...string[]];
    expect(msg).toBe('PinFlow is set up in other-folder.');
    expect(actions).toHaveLength(0);
  });
});
