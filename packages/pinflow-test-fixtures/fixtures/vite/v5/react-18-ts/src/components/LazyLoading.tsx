/**
 * LazyLoading - Tests React.lazy() and Suspense
 *
 * Validates that PinFlow handles:
 * - Components loaded via React.lazy()
 * - Suspense boundaries with fallback content
 * - Dynamic imports and code splitting
 * - Manifest handles async component boundaries correctly
 */

import { lazy, Suspense, useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

// Lazy load components
const LazyComponent = lazy(() =>
  import('./LazyComponent').then((mod) => ({ default: mod.LazyComponent })),
);

const AnotherLazyComponent = lazy(() =>
  import('./LazyComponent').then((mod) => ({
    default: mod.AnotherLazyComponent,
  })),
);

function LoadingFallback() {
  return (
    <div className="loading-fallback">
      <p>Komponente wird geladen...</p>
    </div>
  );
}

function NestedSuspense() {
  return (
    <div className="nested-suspense">
      <h4>Verschachtelte Suspense-Boundary</h4>
      <Suspense fallback={<div>Verschachtelte Komponente wird geladen...</div>}>
        <AnotherLazyComponent />
      </Suspense>
    </div>
  );
}

export function LazyLoading() {
  const [showLazy, setShowLazy] = useState(false);
  const [showNested, setShowNested] = useState(false);

  return (
    <div className="lazy-loading">
      <section>
        <h4>Lazy Component mit Suspense</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setShowLazy(!showLazy)}>
            {showLazy ? 'Verbergen' : 'Anzeigen'}: Lazy Component
          </button>
          {showLazy && (
            <Suspense fallback={<LoadingFallback />}>
              <LazyComponent />
            </Suspense>
          )}
        </div>
      </section>

      <section>
        <h4>Verschachtelte Suspense-Boundaries</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setShowNested(!showNested)}>
            {showNested ? 'Verbergen' : 'Anzeigen'}: Nested Suspense
          </button>
          {showNested && (
            <Suspense fallback={<div>Aeussere Boundary wird geladen...</div>}>
              <div className="outer-suspense">
                <p>Inhalt der aeusseren Suspense-Boundary</p>
                <NestedSuspense />
              </div>
            </Suspense>
          )}
        </div>
      </section>

      <section>
        <h4>Mehrere Lazy Components</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Suspense fallback={<div>Mehrere Komponenten werden geladen...</div>}>
            <div className="multiple-lazy">
              <LazyComponent />
              <AnotherLazyComponent />
            </div>
          </Suspense>
        </div>
      </section>
    </div>
  );
}
