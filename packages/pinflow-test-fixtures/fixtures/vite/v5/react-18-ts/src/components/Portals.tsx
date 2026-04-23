/**
 * Portals - Tests ReactDOM.createPortal()
 *
 * Validates that PinFlow handles:
 * - Elements rendered outside parent DOM hierarchy via portals
 * - Modal/tooltip patterns that use portals
 * - Resolution should point to component defining portal, not portal target
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CaptureIcon } from './CaptureIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  // Portal target - typically document.body or a dedicated container
  const portalTarget = document.getElementById('portal-root') || document.body;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          x
        </button>
        {children}
      </div>
    </div>,
    portalTarget,
  );
}

function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);

  const portalTarget = document.getElementById('portal-root') || document.body;

  return (
    <div
      className="tooltip-trigger"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible &&
        createPortal(
          <div className="tooltip-content">{text}</div>,
          portalTarget,
        )}
    </div>
  );
}

export function Portals() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDirectPortalOpen, setIsDirectPortalOpen] = useState(false);

  return (
    <div className="portals">
      <section>
        <h4>Modal ueber Portal</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setIsModalOpen(true)}>Modal oeffnen</button>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <h2>Modal-Titel</h2>
            <p>Dieser Inhalt wird ueber `createPortal()` gerendert.</p>
            <button onClick={() => setIsModalOpen(false)}>Schliessen</button>
          </Modal>
        </div>
      </section>

      <section>
        <h4>Tooltip ueber Portal</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Tooltip text="Dieser Tooltip wird ueber ein Portal gerendert">
            <span className="tooltip-example">Hover fuer Tooltip</span>
          </Tooltip>
        </div>
      </section>

      <section>
        <h4>Direktes Portal ohne Wrapper-Komponente</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setIsDirectPortalOpen(!isDirectPortalOpen)}>
            {isDirectPortalOpen ? 'Direktes Portal ausblenden' : 'Direktes Portal anzeigen'}
          </button>
          <div className="nested-portal-container">
            {isDirectPortalOpen &&
              createPortal(
                <div className="portaled-content">
                  <p>Direktes Portal ohne Wrapper-Komponente</p>
                  <button onClick={() => setIsDirectPortalOpen(false)}>
                    Portal schliessen
                  </button>
                </div>,
                document.getElementById('portal-root') || document.body,
              )}
          </div>
        </div>
      </section>

      {/* Portal root div (would typically be in index.html) */}
      <div id="portal-root" />
    </div>
  );
}
