/**
 * MemberExpressions - Tests member expression JSX elements
 *
 * Validates that PinFlow handles:
 * - <UI.Button> style components
 * - <Card.Header> style nested components
 */

import { CaptureIcon } from './CaptureIcon';

// Simulated component library
const UI = {
  Button: ({ children }: { children: React.ReactNode }) => (
    <button className="ui-button">{children}</button>
  ),
  Input: ({ placeholder }: { placeholder: string }) => (
    <input className="ui-input" placeholder={placeholder} />
  ),
};

const Card = {
  Header: ({ children }: { children: React.ReactNode }) => (
    <div className="card-header">{children}</div>
  ),
  Body: ({ children }: { children: React.ReactNode }) => (
    <div className="card-body">{children}</div>
  ),
  Footer: ({ children }: { children: React.ReactNode }) => (
    <div className="card-footer">{children}</div>
  ),
};

export function MemberExpressions() {
  return (
    <div className="member-expressions">
      <section>
        <h4>Einfacher Member Expression (UI.Button)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <UI.Button>Klick mich</UI.Button>
        </div>
      </section>

      <section>
        <h4>Member Expression Input (UI.Input)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <UI.Input placeholder="Text eingeben" />
        </div>
      </section>

      <section>
        <h4>Verschachtelte Member Expressions</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="card">
            <Card.Header>Kartentitel</Card.Header>
            <Card.Body>Karteninhalt steht hier</Card.Body>
            <Card.Footer>Kartenfuss</Card.Footer>
          </div>
        </div>
      </section>
    </div>
  );
}
