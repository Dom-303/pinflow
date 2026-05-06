/**
 * Tests for the post-install agent-plugin flow.
 * @module
 */
import { describe, it, expect, vi } from 'vitest';

import { runPostInstall, getInstallCommands } from './post-install.js';

describe('getInstallCommands', () => {
  it('returns commands for codex', () => {
    const cmds = getInstallCommands('codex');
    expect(cmds).toBeDefined();
    expect(cmds?.length).toBe(2);
  });

  it('returns commands for claude-code', () => {
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

  it("'Run' triggers runInstallInTerminal with correct cwd, commands and agentLabel for codex", async () => {
    // Arrange
    const deps = makeDeps('Run');
    const cwd = '/projects/myapp';

    // Act
    await runPostInstall('codex', cwd, {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.runInstallInTerminal).toHaveBeenCalledOnce();
    expect(deps.runInstallInTerminal).toHaveBeenCalledWith(
      cwd,
      [
        'codex marketplace add Dom-303/pinflow',
        'codex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
      ],
      'Codex',
    );
  });

  it("'Show command' calls clipboard.writeText with multi-line codex command and shows confirmation toast", async () => {
    // Arrange
    const deps = makeDeps('Show command');
    // Second call (confirmation toast) returns undefined
    deps.showInformationMessage.mockResolvedValueOnce('Show command').mockResolvedValueOnce(undefined);

    // Act
    await runPostInstall('codex', '/projects/myapp', {
      runInstallInTerminal: deps.runInstallInTerminal,
      _showInformationMessage: deps.showInformationMessage,
      _clipboardWriteText: deps.clipboardWriteText,
    });

    // Assert
    expect(deps.clipboardWriteText).toHaveBeenCalledOnce();
    expect(deps.clipboardWriteText).toHaveBeenCalledWith(
      'codex marketplace add Dom-303/pinflow\ncodex mcp add pinflow -- npx -y --package @pinflow/mcp pinflow-mcp',
    );
    expect(deps.showInformationMessage).toHaveBeenCalledTimes(2);
    const secondCall = deps.showInformationMessage.mock.calls[1];
    expect(secondCall[0]).toContain('Codex install command copied to clipboard');
  });

  it("'Skip' (or undefined) returns without calling terminal or clipboard", async () => {
    // Arrange
    const deps = makeDeps(undefined);

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
    expect(msg).toBe('PinFlow ready in copilot-folder.');
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
    expect(msg).toBe('PinFlow ready in other-folder.');
    expect(actions).toHaveLength(0);
    expect(deps.runInstallInTerminal).not.toHaveBeenCalled();
  });
});
