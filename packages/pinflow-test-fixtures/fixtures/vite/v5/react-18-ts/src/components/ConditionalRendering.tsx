// @ts-nocheck

/**
 * ConditionalRendering - Tests conditional rendering patterns
 *
 * Validates that PinFlow handles:
 * - Logical AND (&&) rendering
 * - Ternary operators
 * - if/else patterns
 */

import { useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function ConditionalRendering() {
  const [showContent, setShowContent] = useState(true);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  return (
    <div className="conditional-rendering">
      <section>
        <h4>Logisches UND (&&)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setShowContent(!showContent)}>
            Inhalt umschalten (aktuell {showContent ? 'sichtbar' : 'verborgen'})
          </button>
          {showContent && <div>Inhalt wird ueber logisches UND angezeigt</div>}
        </div>
      </section>

      <section>
        <h4>Ternaerer Operator</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {showContent ? (
            <div>Inhalt sichtbar (True-Zweig)</div>
          ) : (
            <div>Inhalt verborgen (False-Zweig)</div>
          )}
        </div>
      </section>

      <section>
        <h4>Modusabhaengige Darstellung</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {mode === 'light' ? (
            <div className="light-mode">Light Mode aktiv</div>
          ) : (
            <div className="dark-mode">Dark Mode aktiv</div>
          )}
          <button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
            Modus wechseln (aktuell {mode})
          </button>
        </div>
      </section>
    </div>
  );
}
