/**
 * EventHandlers - Tests event handler attributes
 *
 * Validates that PinFlow correctly handles elements with:
 * - onClick, onChange, onSubmit, onFocus, onBlur, etc.
 */

import { useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function EventHandlers() {
  const [clicks, setClicks] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleClick = () => setClicks(clicks + 1);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="event-handlers">
      <section>
        <h4>Klick-Handler</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={handleClick}>Bereits {clicks} Mal geklickt</button>
        </div>
      </section>

      <section>
        <h4>Eingabe-Handler</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Aktueller Wert: {inputValue || '(leer)'}</p>
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder="Hier etwas eingeben"
          />
        </div>
      </section>

      <section>
        <h4>Formular absenden</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <input type="text" name="username" placeholder="Benutzername" />
              <button type="submit">Absenden</button>
            </div>
          </form>
          {submitted && <div>Formular wurde abgesendet.</div>}
        </div>
      </section>

      <section>
        <h4>Hover fuer Konsolenhinweis</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onMouseEnter={() => console.log('hover')}>
            Hover ausloesen (Konsole pruefen)
          </button>
        </div>
      </section>

      <section>
        <h4>Fokus- und Blur-Handler</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <input
            type="text"
            onFocus={() => console.log('focused')}
            onBlur={() => console.log('blurred')}
            placeholder="Fokus/Blur testen (Konsole pruefen)"
          />
        </div>
      </section>
    </div>
  );
}
