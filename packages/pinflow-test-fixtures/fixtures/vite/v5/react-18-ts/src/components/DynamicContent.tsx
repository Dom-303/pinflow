/**
 * DynamicContent - Tests state-driven dynamic rendering
 *
 * Validates that PinFlow handles:
 * - useState for dynamic content
 * - useEffect for side effects
 * - Dynamically rendered components based on state
 */

import { useState, useEffect } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function DynamicContent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate async data loading
    const timer = setTimeout(() => {
      setItems(['Dynamischer Eintrag 1', 'Dynamischer Eintrag 2', 'Dynamischer Eintrag 3']);
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const addItem = () => {
    setItems([...items, `Dynamischer Eintrag ${items.length + 1}`]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="dynamic-content">
      <section>
        <h4>Zaehler mit useState</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="counter">
            <p>Anzahl: {count}</p>
            <div>
              <button onClick={() => setCount(count + 1)}>Erhoehen</button>
              <button onClick={() => setCount(count - 1)}>Verringern</button>
              <button onClick={() => setCount(0)}>Zuruecksetzen</button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h4>Dynamische Liste mit useEffect</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="list-group">
            {loading ? (
              <div>Laedt...</div>
            ) : (
              <>
                <ul>
                  {items.map((item, index) => (
                    <li key={index} className="list-item-with-button">
                      <span>{item}</span>
                      <button onClick={() => removeItem(index)}>Entfernen</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <button onClick={addItem}>Eintrag hinzufuegen</button>
        </div>
      </section>

      <section>
        <h4>Zustandsabhaengige Hinweise</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {count > 5 && (
            <div className="high-count-message">
              Die Anzahl ist groesser als 5!
            </div>
          )}
          {count < 0 && (
            <div className="negative-count-message">
              Die Anzahl ist negativ!
            </div>
          )}
          {count >= 0 && count <= 5 && (
            <div>Die Anzahl liegt zwischen 0 und 5</div>
          )}
        </div>
      </section>
    </div>
  );
}
