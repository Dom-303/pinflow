/**
 * Shared plugin configuration types
 * @module @pinflow/transform/plugins/types
 */

/**
 * Relay server configuration options shared across bundler plugins
 */
export interface RelayPluginOptions {
  /**
   * Whether to auto-start the relay daemon if not running.
   *
   * @default true
   */
  autoStart?: boolean;

  /**
   * Port for the relay server (only used if starting).
   * 0 means dynamic port assignment.
   *
   * @default 0
   */
  port?: number;

  /**
   * Host for the relay server (only used if starting).
   *
   * @default '127.0.0.1'
   */
  host?: string;

  /**
   * Max request body size in bytes (only used if starting).
   *
   * @default 10485760 (10MB)
   */
  bodyLimit?: number;
}

/**
 * Local runner configuration shared across bundler plugins.
 */
export type RunnerMode = 'auto' | 'manual' | 'external';

export interface RunnerPluginOptions {
  /**
   * Runner ownership mode.
   *
   * - "auto": start the local runner together with the dev server.
   * - "manual": do not start a runner; the user starts one explicitly.
   * - "external": do not start a runner; another tool or extension owns it.
   *
   * When omitted, the legacy autoStart flag is still honored.
   *
   * @default 'manual'
   */
  mode?: RunnerMode;

  /**
   * Whether to auto-start the local runner when the dev server starts.
   * Prefer mode: 'auto' for new configs.
   *
   * @default false
   */
  autoStart?: boolean;

  /**
   * Runner provider preset.
   *
   * @default 'codex'
   */
  provider?: 'codex' | 'claude' | 'auto' | 'custom';

  /**
   * Optional provider model override. Omit to use the local agent default.
   */
  model?: string;

  /**
   * Custom local agent command for provider: 'custom'.
   */
  command?: string;

  /**
   * Custom command args. Use "{prompt}" to pass the PinFlow prompt as an arg.
   */
  args?: string[];

  /**
   * Runner polling interval in milliseconds.
   *
   * @default 2000
   */
  intervalMs?: number;
}

export function shouldStartRunner(
  runner?: Pick<RunnerPluginOptions, 'mode' | 'autoStart'>,
): boolean {
  if (!runner) {
    return false;
  }

  if (runner.mode) {
    return runner.mode === 'auto';
  }

  return runner.autoStart === true;
}

/**
 * Overlay UI configuration options shared across bundler plugins
 */
export interface OverlayPluginOptions {
  /**
   * Initial display mode for the overlay
   *
   * @default 'collapsed'
   */
  initialMode?: 'collapsed' | 'expanded';

  /**
   * Initial product theme for the overlay shell.
   *
   * @default 'light'
   */
  initialTheme?: 'light' | 'dark';

  /**
   * Enable debug logging in the overlay
   *
   * @default false
   */
  debug?: boolean;
}
