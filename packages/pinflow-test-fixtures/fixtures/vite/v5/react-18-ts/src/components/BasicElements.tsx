/**
 * BasicElements - Tests basic HTML elements
 *
 * This component validates that PinFlow correctly injects data-ds attributes
 * on common HTML elements (div, span, button, input, img, form).
 */

import { CaptureIcon } from './CaptureIcon';

export function BasicElements() {
  return (
    <div className="basic-elements">
      <section>
        <h4>Blockelement</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div>Dies ist ein Blockelement</div>
        </div>
      </section>

      <section>
        <h4>Inline-Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <span>Dies ist ein Inline-Element</span>
        </div>
      </section>

      <section>
        <h4>Button-Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button type="button">Dies ist ein Button</button>
        </div>
      </section>

      <section>
        <h4>Texteingabe</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <input type="text" placeholder="Dies ist ein Eingabefeld" />
        </div>
      </section>

      <section>
        <h4>Beschriftetes Formular</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <form>
            <div className="form-row">
              <label htmlFor="email">E-Mail:</label>
              <input id="email" type="email" />
            </div>
          </form>
        </div>
      </section>

      <section>
        <h4>Absatz</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Dies ist ein Absatz</p>
        </div>
      </section>

      <section>
        <h4>Link-Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <a href="#test">Dies ist ein Link</a>
        </div>
      </section>

      <section>
        <h4>Unsortierte Liste</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ul>
            <li>Listeneintrag 1</li>
            <li>Listeneintrag 2</li>
          </ul>
        </div>
      </section>

      <section>
        <h4>Element mit Klassenname</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="basic-elements">
            Blockelement mit `className`-Attribut
          </div>
        </div>
      </section>
    </div>
  );
}
