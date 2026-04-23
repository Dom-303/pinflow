/**
 * SSRHydration - Tests SSR/hydration edge cases
 *
 * Validates that PinFlow handles:
 * - Client-only rendered content (useEffect-only)
 * - typeof window !== 'undefined' checks
 * - Content that differs between server and client
 * - Hydration-safe patterns
 */

import { useState, useEffect } from 'react';
import { CaptureIcon } from './CaptureIcon';

function ClientOnlyContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // This pattern prevents hydration mismatches
  if (!mounted) {
    return <div className="client-only-placeholder">Lade client-seitigen Inhalt...</div>;
  }

  return (
    <div className="client-only-content">
      <p>Dieser Inhalt wird nur im Client gerendert.</p>
      <p>Fensterbreite: {window.innerWidth}</p>
      <button onClick={() => alert('Client-side interaction')}>
        Client-Button
      </button>
    </div>
  );
}

function WindowCheck() {
  const isClient = typeof window !== 'undefined';

  return (
    <div className="window-check">
      <p>Laufzeit: {isClient ? 'Client' : 'Server'}</p>
      {isClient && (
        <div>
          <p>User-Agent: {window.navigator.userAgent.substring(0, 50)}...</p>
          <p>
            Bildschirm: {window.screen.width}x{window.screen.height}
          </p>
        </div>
      )}
    </div>
  );
}

function HydrationSafeTimestamp() {
  const [timestamp, setTimestamp] = useState<number | null>(null);

  useEffect(() => {
    setTimestamp(Date.now());
  }, []);

  return (
    <div className="hydration-safe-timestamp">
      {timestamp === null ? (
        <div>Zeitstempel erscheint nach der Hydration</div>
      ) : (
        <div>Client-Zeitstempel: {new Date(timestamp).toISOString()}</div>
      )}
    </div>
  );
}

function DynamicImportCheck() {
  const [hasLocalStorage, setHasLocalStorage] = useState(false);

  useEffect(() => {
    try {
      localStorage.getItem('test');
      setHasLocalStorage(true);
    } catch {
      setHasLocalStorage(false);
    }
  }, []);

  return (
    <div className="dynamic-import-check">
      <p>LocalStorage verfuegbar: {hasLocalStorage ? 'Ja' : 'Nein'}</p>
      {hasLocalStorage && (
        <button onClick={() => localStorage.setItem('test', 'value')}>
          LocalStorage setzen
        </button>
      )}
    </div>
  );
}

export function SSRHydration() {
  return (
    <div className="ssr-hydration">
      <section className="section">
        <h4>Client-only-Inhalt</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ClientOnlyContent />
        </div>
      </section>

      <section className="section">
        <h4>Fensterpruefung</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <WindowCheck />
        </div>
      </section>

      <section className="section">
        <h4>Hydration-sicherer Zeitstempel</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <HydrationSafeTimestamp />
        </div>
      </section>

      <section className="section">
        <h4>Browser-API-Pruefungen</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <DynamicImportCheck />
        </div>
      </section>
    </div>
  );
}
