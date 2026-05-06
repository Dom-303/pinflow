/**
 * Bidirectionally synced overlay user preferences.
 * Same shape lives in VS Code Settings, the relay file, and the overlay's localStorage.
 * @module @pinflow/core/types/overlay-settings
 */
import { z } from 'zod';

export const OverlaySettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light').describe('Overlay color theme'),
  pickerMode: z
    .enum(['element', 'region', 'multi'])
    .default('element')
    .describe('Default capture mode in the overlay picker'),
  commentEntryMode: z
    .enum(['workspace', 'inline'])
    .default('workspace')
    .describe('Where annotation comments are entered'),
});

export type OverlaySettings = z.infer<typeof OverlaySettingsSchema>;

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings =
  OverlaySettingsSchema.parse({});

const SCHEMA_URL = 'https://pinflow.dev/schemas/overlay-settings.json';

/**
 * Serialize settings to a stable, sorted, pretty-printed JSON string.
 * Used as the canonical on-disk representation; key order is stable so
 * a no-op write produces an identical byte sequence (file mtime guard).
 */
export function serializeOverlaySettings(settings: OverlaySettings): string {
  const payload: Record<string, string> = {
    $schema: SCHEMA_URL,
    commentEntryMode: settings.commentEntryMode,
    pickerMode: settings.pickerMode,
    theme: settings.theme,
  };
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(payload).sort()) {
    sorted[key] = payload[key];
  }
  return JSON.stringify(sorted, null, 2);
}

/**
 * Parse a JSON string into validated settings.
 * Falls back to DEFAULT_OVERLAY_SETTINGS on any error (parse / schema).
 * The `$schema` field is metadata only and is discarded by the schema.
 */
export function parseOverlaySettings(raw: string): OverlaySettings {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return OverlaySettingsSchema.parse(parsed);
  } catch {
    return DEFAULT_OVERLAY_SETTINGS;
  }
}
