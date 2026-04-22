/**
 * Navigation Component
 * Sidebar navigation for test fixture showcase
 */

import pinflowWordmark from '../../../../../../../assets/pinflow-horizontal-light.png';

export interface NavItem {
  id: string;
  label: string;
  section?: string;
}

export const navItems: NavItem[] = [
  {
    id: 'advanced-hooks',
    label: 'Erweiterte Hooks',
    section: 'Erweiterte Muster',
  },
  { id: 'basic-elements', label: 'Grundelemente', section: 'Kernmuster' },
  {
    id: 'children-manipulation',
    label: 'Kinder-Elemente',
    section: 'Erweiterte Muster',
  },
  {
    id: 'compound-components',
    label: 'Verbundene Komponenten',
    section: 'Erweiterte Muster',
  },
  {
    id: 'conditional-rendering',
    label: 'Bedingte Darstellung',
    section: 'Kernmuster',
  },
  { id: 'context', label: 'Kontext', section: 'Erweiterte Muster' },
  { id: 'deeply-nested', label: 'Tief verschachtelt', section: 'Kernmuster' },
  {
    id: 'dynamic-content',
    label: 'Dynamische Inhalte',
    section: 'Kernmuster',
  },
  { id: 'edge-cases', label: 'Sonderfaelle', section: 'Kernmuster' },
  {
    id: 'error-boundaries',
    label: 'Fehlergrenzen',
    section: 'Erweiterte Muster',
  },
  { id: 'event-handlers', label: 'Ereignis-Handler', section: 'Kernmuster' },
  { id: 'fragments', label: 'Fragmente', section: 'Kernmuster' },
  { id: 'h-o-cs', label: 'HOCs', section: 'Kernmuster' },
  {
    id: 'lazy-loading',
    label: 'Verzoegertes Laden',
    section: 'Erweiterte Muster',
  },
  { id: 'lists', label: 'Listen', section: 'Kernmuster' },
  {
    id: 'member-expressions',
    label: 'Member-Ausdruecke',
    section: 'Kernmuster',
  },
  { id: 'memo', label: 'Memo', section: 'Kernmuster' },
  { id: 'portals', label: 'Portale', section: 'Erweiterte Muster' },
  {
    id: 'react18-features',
    label: 'React-18-Funktionen',
    section: 'Erweiterte Muster',
  },
  { id: 'ref-patterns', label: 'Ref-Muster', section: 'Erweiterte Muster' },
  { id: 'render-props', label: 'Render Props', section: 'Kernmuster' },
  {
    id: 's-s-r-hydration',
    label: 'SSR-Hydration',
    section: 'Erweiterte Muster',
  },
  {
    id: 's-v-g-elements',
    label: 'SVG-Elemente',
    section: 'Erweiterte Muster',
  },
  { id: 'self-closing', label: 'Selbstschliessend', section: 'Kernmuster' },
  { id: 'smoke-test', label: 'Smoke-Test', section: 'Tests' },
  { id: 'styling', label: 'Styling', section: 'Erweiterte Muster' },
  {
    id: 'type-script-features',
    label: 'TypeScript-Funktionen',
    section: 'Kernmuster',
  },
];

interface NavigationProps {
  activeItem: string;
  onNavigate: (id: string) => void;
}

export function Navigation({ activeItem, onNavigate }: NavigationProps) {
  const sections = [...new Set(navItems.map((item) => item.section))];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img
            className="sidebar-logo-image"
            src={pinflowWordmark}
            alt="PinFlow"
          />
          <div className="sidebar-brand-copy">
            <span className="sidebar-logo-text">PinFlow Demo</span>
            <span className="sidebar-logo-subtext">
              Vorschauflaeche fuer Live-Mapping, Auswahl und Annotationen
            </span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section} className="sidebar-section">
            <div className="sidebar-section-title">{section}</div>
            {navItems
              .filter((item) => item.section === section)
              .map((item) => (
                <div
                  key={item.id}
                  data-page-id={item.id}
                  className={`sidebar-link ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.label}
                </div>
              ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
