/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverlaySettings } from '@pinflow/core';
import { OverlayStore } from './overlay-store.js';
import { RelayService } from '../services/relay-service.js';

vi.mock('@pinflow/runtime', () => ({
  BridgeDispatch: {
    getInstance: () => ({
      captureContext: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock('../services/relay-service.js', () => ({
  RelayService: {
    getInstance: vi.fn(),
  },
}));

function makeRelayMock() {
  return {
    requestSettingsUpdate: vi.fn(),
  };
}

describe('OverlayStore — user-vs-sync setter split', () => {
  let relayMock: ReturnType<typeof makeRelayMock>;

  beforeEach(() => {
    localStorage.clear();
    OverlayStore.resetInstance();
    vi.clearAllMocks();
    relayMock = makeRelayMock();
    vi.mocked(RelayService.getInstance).mockReturnValue(
      relayMock as unknown as ReturnType<typeof RelayService.getInstance>,
    );
  });

  // ── User-driven setters ──────────────────────────────────────────────────

  describe('setTheme', () => {
    it('calls requestSettingsUpdate when theme changes', () => {
      // Arrange
      const store = OverlayStore.getInstance();

      // Act
      store.setTheme('dark');

      // Assert
      expect(relayMock.requestSettingsUpdate).toHaveBeenCalledOnce();
      expect(relayMock.requestSettingsUpdate).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('is a no-op and does not call requestSettingsUpdate when theme is unchanged', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      expect(store.getState().theme).toBe('light'); // default

      // Act
      store.setTheme('light');

      // Assert
      expect(relayMock.requestSettingsUpdate).not.toHaveBeenCalled();
    });
  });

  describe('setPickerMode', () => {
    it('calls requestSettingsUpdate when pickerMode changes', () => {
      // Arrange
      const store = OverlayStore.getInstance();

      // Act
      store.setPickerMode('region');

      // Assert
      expect(relayMock.requestSettingsUpdate).toHaveBeenCalledOnce();
      expect(relayMock.requestSettingsUpdate).toHaveBeenCalledWith({ pickerMode: 'region' });
    });

    it('is a no-op and does not call requestSettingsUpdate when pickerMode is unchanged', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      expect(store.getState().pickerMode).toBe('element'); // default

      // Act
      store.setPickerMode('element');

      // Assert
      expect(relayMock.requestSettingsUpdate).not.toHaveBeenCalled();
    });
  });

  describe('setCommentEntryMode', () => {
    it('calls requestSettingsUpdate when commentEntryMode changes', () => {
      // Arrange
      const store = OverlayStore.getInstance();

      // Act
      store.setCommentEntryMode('inline');

      // Assert
      expect(relayMock.requestSettingsUpdate).toHaveBeenCalledOnce();
      expect(relayMock.requestSettingsUpdate).toHaveBeenCalledWith({ commentEntryMode: 'inline' });
    });
  });

  // ── applySyncedSettings ─────────────────────────────────────────────────

  describe('applySyncedSettings', () => {
    it('applies a full settings patch and writes each key to localStorage', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      const settings: OverlaySettings = { theme: 'dark', pickerMode: 'region', commentEntryMode: 'inline' };

      // Act
      store.applySyncedSettings(settings);

      // Assert
      expect(store.getState().theme).toBe('dark');
      expect(store.getState().pickerMode).toBe('region');
      expect(store.getState().commentEntryMode).toBe('inline');
      expect(localStorage.getItem('pinflow:theme')).toBe('dark');
      expect(localStorage.getItem('pinflow:pickerMode')).toBe('region');
      expect(localStorage.getItem('pinflow:commentEntryMode')).toBe('inline');
    });

    it('does NOT call requestSettingsUpdate (sync-driven path must not echo back)', () => {
      // Arrange
      const store = OverlayStore.getInstance();

      // Act
      store.applySyncedSettings({ theme: 'dark' });

      // Assert
      expect(relayMock.requestSettingsUpdate).not.toHaveBeenCalled();
    });

    it('is a no-op (no setState, no listener fire) when settings are identical to current state', () => {
      // Arrange
      const store = OverlayStore.getInstance();
      const listener = vi.fn();
      store.subscribe(listener);
      listener.mockClear(); // ignore the initial call from subscribe if any

      // Act — defaults are light/element/workspace, send the same
      store.applySyncedSettings({ theme: 'light', pickerMode: 'element', commentEntryMode: 'workspace' });

      // Assert
      expect(listener).not.toHaveBeenCalled();
      expect(relayMock.requestSettingsUpdate).not.toHaveBeenCalled();
    });
  });
});
