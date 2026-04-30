/**
 * Navigation Component
 * Sidebar navigation for the PinFlow demo canvas
 */

import { useState } from 'react';
import pinflowIcon from '../../../../../../../assets/pinflow-icon-light.png';

export interface NavItem {
  id: string;
  label: string;
  section?: string;
}

export const navItems: NavItem[] = [
  { id: 'home', label: 'Developer Canvas', section: 'Start' },
  { id: 'smoke-test', label: 'Smoke-Test', section: 'Start' },
  { id: 'basic-elements', label: 'Grundelemente', section: 'Normale UI' },
  { id: 'styling', label: 'Styling', section: 'Normale UI' },
  { id: 's-v-g-elements', label: 'SVG-Elemente', section: 'Normale UI' },
  { id: 'lists', label: 'Listen', section: 'Normale UI' },
  { id: 'event-handlers', label: 'Event-Handler', section: 'Normale UI' },
  {
    id: 'advanced-hooks',
    label: 'Advanced Hooks',
    section: 'Interaktion & Zustand',
  },
  {
    id: 'conditional-rendering',
    label: 'Bedingtes Rendering',
    section: 'Interaktion & Zustand',
  },
  {
    id: 'dynamic-content',
    label: 'Dynamische Inhalte',
    section: 'Interaktion & Zustand',
  },
  { id: 'context', label: 'Context API', section: 'Interaktion & Zustand' },
  {
    id: 'ref-patterns',
    label: 'Ref-Patterns',
    section: 'Interaktion & Zustand',
  },
  {
    id: 'children-manipulation',
    label: 'Children API',
    section: 'React-Struktur',
  },
  {
    id: 'compound-components',
    label: 'Compound Components',
    section: 'React-Struktur',
  },
  {
    id: 'deeply-nested',
    label: 'Tiefe Hierarchien',
    section: 'React-Struktur',
  },
  { id: 'fragments', label: 'Fragmente', section: 'React-Struktur' },
  { id: 'h-o-cs', label: 'HOCs', section: 'React-Struktur' },
  {
    id: 'member-expressions',
    label: 'Member Expressions',
    section: 'React-Struktur',
  },
  { id: 'memo', label: 'Memo', section: 'React-Struktur' },
  { id: 'render-props', label: 'Render Props', section: 'React-Struktur' },
  {
    id: 'self-closing',
    label: 'Self-Closing Tags',
    section: 'React-Struktur',
  },
  {
    id: 'type-script-features',
    label: 'TypeScript Features',
    section: 'React-Struktur',
  },
  {
    id: 'lazy-loading',
    label: 'Lazy Loading',
    section: 'Rendering & Laufzeit',
  },
  { id: 'portals', label: 'Portals', section: 'Rendering & Laufzeit' },
  {
    id: 'react18-features',
    label: 'React 18 Features',
    section: 'Rendering & Laufzeit',
  },
  {
    id: 's-s-r-hydration',
    label: 'SSR & Hydration',
    section: 'Rendering & Laufzeit',
  },
  {
    id: 'error-boundaries',
    label: 'Error Boundaries',
    section: 'Rendering & Laufzeit',
  },
  { id: 'edge-cases', label: 'Edge Cases', section: 'Randfaelle' },
];

interface NavigationProps {
  activeItem: string;
  onNavigate: (id: string) => void;
  onOpenPinFlow: () => void;
}

export function Navigation({
  activeItem,
  onNavigate,
  onOpenPinFlow,
}: NavigationProps) {
  const sections = [...new Set(navItems.map((item) => item.section))];
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());

  const toggleSection = (section: string) => {
    setOpenSections((current) => {
      const next = new Set(current);

      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }

      return next;
    });
  };

  const handleNavigate = (item: NavItem) => {
    if (item.section) {
      setOpenSections((current) => new Set(current).add(item.section!));
    }

    onNavigate(item.id);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-badge" aria-hidden="true">
            <img className="sidebar-logo-icon" src={pinflowIcon} alt="" />
          </span>
          <div className="sidebar-brand-copy">
            <span className="sidebar-brand-tag">Vorschau-Canvas</span>
            <span className="sidebar-logo-text">PinFlow Vorschau</span>
            <span className="sidebar-logo-subtext">
              Lokales Labor fuer Picker, Runner und Repo-Diffs
            </span>
          </div>
        </div>
        <div className="sidebar-lab-meta" aria-label="Laborstatus">
          <span>Local</span>
          <span>Repo truth</span>
        </div>
        <nav className="sidebar-area-switcher" aria-label="Bereich wechseln">
          <button type="button" onClick={onOpenPinFlow}>
            PinFlow
          </button>
          <button type="button" className="active">
            Developer Canvas
          </button>
        </nav>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => {
          const sectionItems = navItems.filter((item) => item.section === section);
          const isOpen = section ? openSections.has(section) : true;

          return (
            <div key={section} className="sidebar-section">
              <button
                type="button"
                className={`sidebar-section-toggle ${isOpen ? 'open' : ''}`}
                aria-expanded={isOpen}
                onClick={() => section && toggleSection(section)}
              >
                <span>{section}</span>
                <span>{sectionItems.length}</span>
              </button>
              <div className={`sidebar-section-panel ${isOpen ? 'open' : ''}`}>
                {sectionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-page-id={item.id}
                    className={`sidebar-link ${activeItem === item.id ? 'active' : ''}`}
                    onClick={() => handleNavigate(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
