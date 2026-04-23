/**
 * ErrorBoundaries - Tests React Error Boundaries
 *
 * Validates that PinFlow handles:
 * - Class components with componentDidCatch
 * - Error boundary fallback UI
 * - Components that throw errors
 */

import { Component, ReactNode, useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Fehler von Error Boundary abgefangen:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-fallback">
            <h4>Etwas ist schiefgelaufen</h4>
            <p>Fehler: {this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })}>
              Erneut versuchen
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Absichtlich ausgeloester Fehler aus ThrowingComponent');
  }

  return (
    <div className="throwing-component">
      <p>Diese Komponente wirft aktuell keinen Fehler.</p>
    </div>
  );
}

function ConditionalError() {
  const [throwError, setThrowError] = useState(false);

  return (
    <div className="conditional-error">
      <button onClick={() => setThrowError(true)}>Fehler ausloesen</button>
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={throwError} />
      </ErrorBoundary>
    </div>
  );
}

export function ErrorBoundaries() {
  const [reset, setReset] = useState(0);

  return (
    <div className="error-boundaries">
      <section>
        <h4>Grundlegende Error Boundary</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Sicherer Inhalt innerhalb einer Error Boundary:</p>
          <ErrorBoundary>
            <div className="safe-content">
              <p>Dieser Inhalt liegt geschuetzt in einer Error Boundary.</p>
              <button>Sicherer Button</button>
            </div>
          </ErrorBoundary>
        </div>
      </section>

      <section>
        <h4>Error Boundary mit eigener Fallback-UI</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Error Boundary mit eigener Fallback-Nachricht:</p>
          <ErrorBoundary
            fallback={
              <div className="custom-fallback">
                <h5>Eigener Error-Fallback</h5>
                <p>Bitte den Support kontaktieren.</p>
              </div>
            }
          >
            <div className="more-safe-content">
              <p>Weiterer Bereich mit Fehlerabsicherung.</p>
            </div>
          </ErrorBoundary>
        </div>
      </section>

      <section>
        <h4>Fehler gezielt ausloesen</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Per Klick einen Fehler ausloesen und die Error Boundary pruefen:</p>
          <ConditionalError key={reset} />
          <button onClick={() => setReset((r) => r + 1)}>Alles zuruecksetzen</button>
        </div>
      </section>

      <section>
        <h4>Verschachtelte Error Boundaries</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Mehrere Error Boundaries ineinander verschachtelt:</p>
          <ErrorBoundary>
            <div className="outer-boundary">
              <p>Aeussere Error Boundary</p>
              <ErrorBoundary>
                <div className="inner-boundary">
                  <p>Innere Error Boundary</p>
                </div>
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        </div>
      </section>
    </div>
  );
}
