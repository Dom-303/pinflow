/**
 * Navigation Component
 * Sidebar navigation for the PinFlow demo canvas
 */

import pinflowIcon from '../../../../../../../assets/pinflow-icon-light.png';

export interface NavItem {
  id: string;
  label: string;
  section?: string;
}

export const navItems: NavItem[] = [
  { id: 'home', label: 'Home', section: 'Vorschau' },
  { id: 'advanced-hooks', label: 'Advanced Hooks', section: 'React-Muster' },
  { id: 'basic-elements', label: 'Grundelemente', section: 'React-Muster' },
  {
    id: 'children-manipulation',
    label: 'Children API',
    section: 'React-Muster',
  },
  {
    id: 'compound-components',
    label: 'Compound Components',
    section: 'React-Muster',
  },
  {
    id: 'conditional-rendering',
    label: 'Bedingtes Rendering',
    section: 'React-Muster',
  },
  { id: 'context', label: 'Context API', section: 'React-Muster' },
  {
    id: 'deeply-nested',
    label: 'Tiefe Hierarchien',
    section: 'React-Muster',
  },
  {
    id: 'dynamic-content',
    label: 'Dynamische Inhalte',
    section: 'React-Muster',
  },
  { id: 'edge-cases', label: 'Edge Cases', section: 'React-Muster' },
  {
    id: 'error-boundaries',
    label: 'Error Boundaries',
    section: 'React-Muster',
  },
  { id: 'event-handlers', label: 'Event-Handler', section: 'React-Muster' },
  { id: 'fragments', label: 'Fragmente', section: 'React-Muster' },
  { id: 'h-o-cs', label: 'HOCs', section: 'React-Muster' },
  { id: 'lists', label: 'Listen', section: 'React-Muster' },
  {
    id: 'member-expressions',
    label: 'Member Expressions',
    section: 'React-Muster',
  },
  { id: 'memo', label: 'Memo', section: 'React-Muster' },
  { id: 'ref-patterns', label: 'Ref-Patterns', section: 'React-Muster' },
  { id: 'render-props', label: 'Render Props', section: 'React-Muster' },
  {
    id: 'self-closing',
    label: 'Self-Closing Tags',
    section: 'React-Muster',
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
    id: 's-v-g-elements',
    label: 'SVG-Elemente',
    section: 'Rendering & Laufzeit',
  },
  { id: 'styling', label: 'Styling', section: 'Rendering & Laufzeit' },
  {
    id: 'type-script-features',
    label: 'TypeScript Features',
    section: 'Rendering & Laufzeit',
  },
  { id: 'smoke-test', label: 'Smoke-Test', section: 'Validierung' },
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
          <span className="sidebar-logo-badge" aria-hidden="true">
            <img className="sidebar-logo-icon" src={pinflowIcon} alt="" />
          </span>
          <div className="sidebar-brand-copy">
            <span className="sidebar-brand-tag">Vorschau-Canvas</span>
            <span className="sidebar-logo-text">PinFlow Vorschau</span>
            <span className="sidebar-logo-subtext">
              React-Canvas fuer Auswahl, Mapping und Annotationen
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
