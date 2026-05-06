import { describe, it, expect } from 'vitest';
import {
  OverlaySettingsSchema,
  DEFAULT_OVERLAY_SETTINGS,
  serializeOverlaySettings,
  parseOverlaySettings,
} from './overlay-settings.js';

describe('OverlaySettings schema', () => {
  describe('OverlaySettingsSchema', () => {
    it('parses a fully populated valid settings object', () => {
      // Arrange
      const input = {
        theme: 'dark',
        pickerMode: 'region',
        commentEntryMode: 'inline',
      };

      // Act
      const result = OverlaySettingsSchema.parse(input);

      // Assert
      expect(result).toEqual(input);
    });

    it('fills missing keys with defaults', () => {
      // Arrange
      const input = {};

      // Act
      const result = OverlaySettingsSchema.parse(input);

      // Assert
      expect(result).toEqual({
        theme: 'light',
        pickerMode: 'element',
        commentEntryMode: 'workspace',
      });
    });

    it('rejects invalid theme value', () => {
      // Arrange
      const input = { theme: 'system' };

      // Act + Assert
      expect(() => OverlaySettingsSchema.parse(input)).toThrow();
    });

    it('rejects invalid pickerMode value', () => {
      expect(() =>
        OverlaySettingsSchema.parse({ pickerMode: 'lasso' }),
      ).toThrow();
    });
  });

  describe('DEFAULT_OVERLAY_SETTINGS', () => {
    it('matches the schema default', () => {
      expect(OverlaySettingsSchema.parse({})).toEqual(DEFAULT_OVERLAY_SETTINGS);
    });
  });

  describe('serializeOverlaySettings', () => {
    it('produces stable 2-space-indented JSON with sorted keys + $schema header', () => {
      // Arrange
      const settings = {
        theme: 'dark' as const,
        pickerMode: 'element' as const,
        commentEntryMode: 'workspace' as const,
      };

      // Act
      const output = serializeOverlaySettings(settings);

      // Assert
      expect(output).toBe(
        [
          '{',
          '  "$schema": "https://pinflow.dev/schemas/overlay-settings.json",',
          '  "commentEntryMode": "workspace",',
          '  "pickerMode": "element",',
          '  "theme": "dark"',
          '}',
        ].join('\n'),
      );
    });

    it('is deterministic for the same input (key order independent)', () => {
      // Arrange
      const a = { theme: 'light' as const, pickerMode: 'element' as const, commentEntryMode: 'workspace' as const };
      const b = { commentEntryMode: 'workspace' as const, pickerMode: 'element' as const, theme: 'light' as const };

      // Act + Assert
      expect(serializeOverlaySettings(a)).toBe(serializeOverlaySettings(b));
    });
  });

  describe('parseOverlaySettings', () => {
    it('returns defaults for invalid JSON string', () => {
      expect(parseOverlaySettings('not-json')).toEqual(DEFAULT_OVERLAY_SETTINGS);
    });

    it('returns defaults when fields are missing', () => {
      expect(parseOverlaySettings('{}')).toEqual(DEFAULT_OVERLAY_SETTINGS);
    });

    it('returns defaults when a value is invalid', () => {
      expect(parseOverlaySettings('{"theme": "system"}')).toEqual(
        DEFAULT_OVERLAY_SETTINGS,
      );
    });

    it('round-trips a serialized object', () => {
      // Arrange
      const settings = {
        theme: 'dark' as const,
        pickerMode: 'multi' as const,
        commentEntryMode: 'inline' as const,
      };

      // Act
      const parsed = parseOverlaySettings(serializeOverlaySettings(settings));

      // Assert
      expect(parsed).toEqual(settings);
    });
  });
});
