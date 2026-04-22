/**
 * Tests for overlay initialization dev-mode guard
 *
 * Verifies that the overlay refuses to initialize when no active
 * PinFlow dev session is detected.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Mock Setup (hoisted to avoid vi.mock factory scoping issues)
// ============================================================================

const {
  mockOverlayStoreGetInstance,
  mockOverlayStoreResetInstance,
  mockEventManagerGetInstance,
  mockEventManagerResetInstance,
  mockRelayServiceGetInstance,
  mockRelayServiceResetInstance,
} = vi.hoisted(() => ({
  mockOverlayStoreGetInstance: vi.fn(),
  mockOverlayStoreResetInstance: vi.fn(),
  mockEventManagerGetInstance: vi.fn().mockReturnValue({
    initGlobalShortcuts: vi.fn(),
    setOverlayElement: vi.fn(),
  }),
  mockEventManagerResetInstance: vi.fn(),
  mockRelayServiceGetInstance: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(true),
  }),
  mockRelayServiceResetInstance: vi.fn(),
}));

// Mock transitive dependency to prevent Vite import analysis errors
vi.mock('@pinflow/relay/client', () => ({
  RelayHttpClient: vi.fn(),
  RelayWSClient: vi.fn(),
}));

vi.mock('./overlay-store.js', () => ({
  OverlayStore: {
    getInstance: mockOverlayStoreGetInstance,
    resetInstance: mockOverlayStoreResetInstance,
  },
}));

vi.mock('./event-manager.js', () => ({
  EventManager: {
    getInstance: mockEventManagerGetInstance,
    resetInstance: mockEventManagerResetInstance,
  },
}));

vi.mock('../services/relay-service.js', () => ({
  RelayService: {
    getInstance: mockRelayServiceGetInstance,
    resetInstance: mockRelayServiceResetInstance,
  },
}));

vi.mock('../components/ds-overlay.js', () => ({}));

import { initOverlay, isOverlayInitialized, resetOverlay } from './init.js';

// ============================================================================
// Tests
// ============================================================================

describe('initOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOverlay();
  });

  afterEach(() => {
    resetOverlay();
    delete window.__PINFLOW_RELAY_PORT__;
    delete window.__PINFLOW_OVERLAY_OPTIONS__;
    vi.restoreAllMocks();
  });

  describe('Dev-mode guard', () => {
    it('should not initialize when no PinFlow relay port is set', async () => {
      // Arrange
      delete window.__PINFLOW_RELAY_PORT__;
      const consoleSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      // Act
      await initOverlay();

      // Assert
      expect(isOverlayInitialized()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No active PinFlow dev session detected'),
      );
      expect(mockOverlayStoreGetInstance).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should initialize when __PINFLOW_RELAY_PORT__ is set', async () => {
      // Arrange
      window.__PINFLOW_RELAY_PORT__ = 4500;

      // Act
      await initOverlay();

      // Assert
      expect(isOverlayInitialized()).toBe(true);
      expect(mockOverlayStoreGetInstance).toHaveBeenCalled();
      expect(mockEventManagerGetInstance).toHaveBeenCalled();
      expect(mockRelayServiceGetInstance).toHaveBeenCalled();
    });

    it('should ignore unrelated PinFlow-looking globals', async () => {
      // Arrange
      delete window.__PINFLOW_RELAY_PORT__;
      // @ts-expect-error deliberate unrelated global for guard coverage
      window.__PINFLOW_RELAY_PORT_LEGACY__ = 4500;

      // Act
      await initOverlay();

      // Assert
      expect(isOverlayInitialized()).toBe(false);
      expect(mockOverlayStoreGetInstance).not.toHaveBeenCalled();
      expect(mockEventManagerGetInstance).not.toHaveBeenCalled();
      expect(mockRelayServiceGetInstance).not.toHaveBeenCalled();
    });

  });
});
