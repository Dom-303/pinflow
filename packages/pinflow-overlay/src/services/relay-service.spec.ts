/**
 * Tests for RelayService WebSocket runtime context responses.
 *
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WS_EVENTS } from '@pinflow/core';

const {
  handlers,
  mockSend,
  mockConnect,
  mockDisconnect,
  mockGetHealth,
  mockListAnnotations,
  mockSetRelayConnection,
  mockSetAnnotations,
  mockGetState,
  mockBridgeIsReady,
  mockCaptureContextForEntry,
  mockGetElementInfo,
} = vi.hoisted(() => ({
  handlers: new Map<string, (data: unknown) => void | Promise<void>>(),
  mockSend: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockGetHealth: vi.fn(),
  mockListAnnotations: vi.fn(),
  mockSetRelayConnection: vi.fn(),
  mockSetAnnotations: vi.fn(),
  mockGetState: vi.fn(),
  mockBridgeIsReady: vi.fn(),
  mockCaptureContextForEntry: vi.fn(),
  mockGetElementInfo: vi.fn(),
}));

vi.mock('@pinflow/relay/client', () => ({
  RelayHttpClient: vi.fn().mockImplementation(function () {
    return {
      getHealth: mockGetHealth,
      listAnnotations: mockListAnnotations,
    };
  }),
  RelayWSClient: vi.fn().mockImplementation(function () {
    return {
      on: vi.fn((event: string, handler: (data: unknown) => void) => {
        handlers.set(event, handler);
        return vi.fn();
      }),
      onAnnotationCreated: vi.fn(() => vi.fn()),
      onAnnotationUpdated: vi.fn(() => vi.fn()),
      send: mockSend,
      connect: mockConnect,
      disconnect: mockDisconnect,
    };
  }),
}));

vi.mock('../core/overlay-store.js', () => ({
  OverlayStore: {
    getInstance: vi.fn().mockReturnValue({
      getState: mockGetState,
      setRelayConnection: mockSetRelayConnection,
      setAnnotations: mockSetAnnotations,
    }),
  },
}));

vi.mock('@pinflow/runtime', () => ({
  BridgeDispatch: {
    getInstance: vi.fn().mockReturnValue({
      isReady: mockBridgeIsReady,
      captureContextForEntry: mockCaptureContextForEntry,
      getElementInfo: mockGetElementInfo,
    }),
  },
}));

import { RelayService } from './relay-service.js';

describe('RelayService', () => {
  beforeEach(() => {
    RelayService.resetInstance();
    handlers.clear();
    vi.clearAllMocks();
    window.__PINFLOW_RELAY_PORT__ = 4500;
    mockGetState.mockReturnValue({ debug: false });
    mockGetHealth.mockResolvedValue({ status: 'healthy' });
    mockListAnnotations.mockResolvedValue({ annotations: [] });
    mockBridgeIsReady.mockReturnValue(true);
  });

  it('reports visible element separately from missing runtime context', async () => {
    const element = document.createElement('button');
    element.setAttribute('type', 'button');
    element.innerText = 'Save';
    mockCaptureContextForEntry.mockResolvedValue(null);
    mockGetElementInfo.mockReturnValue({ element, entryId: 'abc12345' });

    const relayService = RelayService.getInstance();
    await relayService.initialize();

    const handler = handlers.get(WS_EVENTS.CONTEXT_REQUEST);
    expect(handler).toBeDefined();

    await handler?.({ requestId: 'req-1', entryId: 'abc12345' });

    expect(mockSend).toHaveBeenCalledWith(WS_EVENTS.CONTEXT_RESPONSE, {
      requestId: 'req-1',
      success: false,
      rendered: true,
      elementFound: true,
      contextCaptured: false,
      context: undefined,
      elementInfo: {
        tagName: 'button',
        attributes: { type: 'button' },
        innerText: 'Save',
      },
      error: 'Context capture returned null',
    });
  });
});
