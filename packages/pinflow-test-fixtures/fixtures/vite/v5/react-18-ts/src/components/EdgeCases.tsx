/**
 * EdgeCases - Tests edge case scenarios
 *
 * Validates that PinFlow handles:
 * - null returns
 * - undefined returns
 * - boolean returns
 * - Empty components
 * - Components with no JSX
 */

import { CaptureIcon } from './CaptureIcon';

function NullComponent() {
  return null;
}

function UndefinedComponent() {
  return undefined as unknown as JSX.Element;
}

function BooleanComponent() {
  return false as unknown as JSX.Element;
}

function EmptyFragment() {
  return <></>;
}

function ConditionalNull({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }
  return <div>Bedingt gerenderter Inhalt</div>;
}

export function EdgeCases() {
  return (
    <div className="edge-cases">
      <section>
        <h4>Null- und Undefined-Rueckgaben</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Komponenten mit Rueckgabe `null` oder `undefined`:</p>
          <NullComponent />
          <UndefinedComponent />
          <p>(Oberhalb sollte nichts sichtbar sein)</p>
        </div>
      </section>

      <section>
        <h4>Boolean-Rueckgaben</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Komponente mit Rueckgabe eines Boolean-Werts:</p>
          <BooleanComponent />
          <p>(Oberhalb sollte nichts sichtbar sein)</p>
        </div>
      </section>

      <section>
        <h4>Leeres Fragment</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Komponente mit leerem Fragment:</p>
          <EmptyFragment />
          <p>(Oberhalb sollte nichts sichtbar sein)</p>
        </div>
      </section>

      <section>
        <h4>Bedingte Null-Rueckgaben</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ConditionalNull show={false} />
          <p>(Oberhalb sollte der Inhalt verborgen sein)</p>
          <ConditionalNull show={true} />
          <p>(Oberhalb sollte der Inhalt sichtbar sein)</p>
        </div>
      </section>

      <section>
        <h4>Inline-Null/Undefined/Boolean</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {null}
          {undefined}
          {false}
          {true}
          <p>(Die Werte oberhalb sollten nicht sichtbar gerendert werden)</p>
        </div>
      </section>

      <section>
        <h4>Leere und Whitespace-divs</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div style={{ border: '1px solid gray', minHeight: '20px' }}></div>
          <p>Leeres div oberhalb</p>
          <div style={{ border: '1px solid gray', minHeight: '20px' }}> </div>
          <p>Whitespace-div oberhalb</p>
        </div>
      </section>

      <section>
        <h4>Self-Closing div</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div />
          <p>(Self-closing div oberhalb: ungewoehnlich, aber gueltig)</p>
        </div>
      </section>
    </div>
  );
}
