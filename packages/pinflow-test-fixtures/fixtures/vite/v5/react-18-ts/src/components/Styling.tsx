/**
 * Styling - Tests various styling patterns
 *
 * Validates that PinFlow handles:
 * - Inline styles with dynamic values
 * - Large className strings (utility-first/Tailwind-style)
 * - Style objects
 * - CSS Modules (if configured)
 */

import { useState, CSSProperties } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function Styling() {
  const [color, setColor] = useState('blue');
  const [size, setSize] = useState(16);

  const dynamicStyle: CSSProperties = {
    color: color,
    fontSize: `${size}px`,
    padding: 'var(--spacing-lg)',
    border: '1px solid var(--color-border-primary)',
    borderRadius: '10px',
    background: 'var(--color-bg-elevated)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-normal)',
  };

  const utilityClasses =
    'flex items-center justify-between p-4 mb-2 bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200';

  return (
    <div className="styling">
      <section>
        <h4>Inline Styles (dynamisch)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div style={dynamicStyle} className="dynamic-styled">
            Dynamisch gestyltes Element
          </div>
          <div>
            <label>
              Farbe:
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="blue">Blau</option>
                <option value="red">Rot</option>
                <option value="green">Gruen</option>
              </select>
            </label>
            <label>
              Groesse:
              <input
                type="range"
                min="10"
                max="30"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </section>

      <section>
        <h4>Direkte Inline Styles</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: 'var(--spacing-lg)',
              borderRadius: '10px',
              border: '1px solid var(--color-border-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="direct-inline"
          >
            <p style={{ margin: 0, fontWeight: 'bold' }}>Fetter Text</p>
            <span
              style={{ color: 'var(--color-accent-purple)', fontSize: '14px' }}
            >
              Violettes span
            </span>
          </div>
        </div>
      </section>

      <section>
        <h4>Utility-First-Klassen</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className={`demo-box demo-box-blue ${utilityClasses}`}>
            <span>Element mit vielen Utility-Klassen</span>
            <button>Button</button>
          </div>
        </div>
      </section>

      <section>
        <h4>Bedingte Klassen</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            className={`demo-box demo-box-green conditional-box ${color === 'red' ? 'is-red' : 'not-red'} ${size > 20 ? 'is-large' : 'is-small'}`}
          >
            Element mit bedingten Klassen
          </div>
        </div>
      </section>

      <section>
        <h4>Array-Join-Pattern</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            className={[
              'demo-box',
              'demo-box-amber',
              'base-class',
              'another-class',
              color === 'blue' && 'blue-variant',
              size > 20 && 'large-variant',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Klassen per Array zusammengefuegt
          </div>
        </div>
      </section>

      <section>
        <h4>Style-Komposition</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            style={{
              ...dynamicStyle,
              backgroundColor: 'var(--color-bg-elevated)',
              margin: 'var(--spacing-md) 0',
            }}
            className="composed-styles"
          >
            Zusammengesetzte Styles
          </div>
        </div>
      </section>
    </div>
  );
}
