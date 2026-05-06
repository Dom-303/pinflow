/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlayStore } from './overlay-store.js';

vi.mock('@pinflow/runtime', () => ({
  BridgeDispatch: {
    getInstance: () => ({
      captureContext: vi.fn(),
    }),
  },
}));

vi.mock('../services/relay-service.js', () => ({
  RelayService: {
    getInstance: () => ({
      resolve: vi.fn(),
      createAnnotation: vi.fn(),
      patchAnnotation: vi.fn(),
      dispatchAnnotations: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('OverlayStore persistence — mode', () => {
  beforeEach(() => {
    localStorage.clear();
    OverlayStore.resetInstance();
  });

  it('persists "expanded" to localStorage when setMode is called with "expanded"', () => {
    const store = OverlayStore.getInstance();

    store.setMode('expanded');

    expect(localStorage.getItem('pinflow:mode')).toBe('expanded');
  });

  it('persists "collapsed" to localStorage when setMode is called with "collapsed"', () => {
    const store = OverlayStore.getInstance();
    store.setMode('expanded');

    store.setMode('collapsed');

    expect(localStorage.getItem('pinflow:mode')).toBe('collapsed');
  });

  it('does NOT write to localStorage when setMode is called with "capturing"', () => {
    const store = OverlayStore.getInstance();
    localStorage.setItem('pinflow:mode', 'expanded');

    store.setMode('capturing');

    expect(localStorage.getItem('pinflow:mode')).toBe('expanded');
  });

  it('loadMode returns "expanded" when localStorage contains "expanded"', () => {
    localStorage.setItem('pinflow:mode', 'expanded');

    const loaded = OverlayStore.loadMode();

    expect(loaded).toBe('expanded');
  });

  it('loadMode returns "collapsed" when localStorage is empty', () => {
    const loaded = OverlayStore.loadMode();

    expect(loaded).toBe('collapsed');
  });

  it('loadMode returns "collapsed" when localStorage contains an invalid value', () => {
    localStorage.setItem('pinflow:mode', 'random-string');

    const loaded = OverlayStore.loadMode();

    expect(loaded).toBe('collapsed');
  });

  it('loadMode returns "collapsed" when localStorage contains "capturing" (transient, not a valid persisted value)', () => {
    localStorage.setItem('pinflow:mode', 'capturing');

    const loaded = OverlayStore.loadMode();

    expect(loaded).toBe('collapsed');
  });

  it('restores "expanded" mode on the next getInstance after setMode("expanded")', () => {
    const store = OverlayStore.getInstance();
    store.setMode('expanded');
    OverlayStore.resetInstance();

    const restored = OverlayStore.getInstance();

    expect(restored.getState().mode).toBe('expanded');
  });
});

describe('OverlayStore persistence — activeTab', () => {
  beforeEach(() => {
    localStorage.clear();
    OverlayStore.resetInstance();
  });

  it('persists "flow" to localStorage when setActiveTab is called with "flow"', () => {
    const store = OverlayStore.getInstance();

    store.setActiveTab('flow');

    expect(localStorage.getItem('pinflow:activeTab')).toBe('flow');
  });

  it('persists "history" to localStorage when setActiveTab is called with "history"', () => {
    const store = OverlayStore.getInstance();

    store.setActiveTab('history');

    expect(localStorage.getItem('pinflow:activeTab')).toBe('history');
  });

  it('persists "workspace" to localStorage when setActiveTab is called with "workspace"', () => {
    const store = OverlayStore.getInstance();
    store.setActiveTab('history');

    store.setActiveTab('workspace');

    expect(localStorage.getItem('pinflow:activeTab')).toBe('workspace');
  });

  it('loadActiveTab returns "flow" when localStorage contains "flow"', () => {
    localStorage.setItem('pinflow:activeTab', 'flow');

    const loaded = OverlayStore.loadActiveTab();

    expect(loaded).toBe('flow');
  });

  it('loadActiveTab returns "history" when localStorage contains "history"', () => {
    localStorage.setItem('pinflow:activeTab', 'history');

    const loaded = OverlayStore.loadActiveTab();

    expect(loaded).toBe('history');
  });

  it('loadActiveTab returns "workspace" when localStorage is empty', () => {
    const loaded = OverlayStore.loadActiveTab();

    expect(loaded).toBe('workspace');
  });

  it('loadActiveTab returns "workspace" when localStorage contains an invalid value', () => {
    localStorage.setItem('pinflow:activeTab', 'random-string');

    const loaded = OverlayStore.loadActiveTab();

    expect(loaded).toBe('workspace');
  });

  it('restores "history" activeTab on the next getInstance after setActiveTab("history")', () => {
    const store = OverlayStore.getInstance();
    store.setActiveTab('history');
    OverlayStore.resetInstance();

    const restored = OverlayStore.getInstance();

    expect(restored.getState().activeTab).toBe('history');
  });
});
