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
  { id: 'home', label: 'Startseite', section: 'Uebersicht' },
  { id: 'advanced-hooks', label: 'Advanced Hooks', section: 'React Patterns' },
  { id: 'basic-elements', label: 'Basic Elements', section: 'React Patterns' },
  {
    id: 'children-manipulation',
    label: 'Children Manipulation',
    section: 'React Patterns',
  },
  {
    id: 'compound-components',
    label: 'Compound Components',
    section: 'React Patterns',
  },
  {
    id: 'conditional-rendering',
    label: 'Conditional Rendering',
    section: 'React Patterns',
  },
  { id: 'context', label: 'Context API', section: 'React Patterns' },
  { id: 'deeply-nested', label: 'Deeply Nested', section: 'React Patterns' },
  { id: 'dynamic-content', label: 'Dynamic Content', section: 'React Patterns' },
  { id: 'edge-cases', label: 'Edge Cases', section: 'React Patterns' },
  {
    id: 'error-boundaries',
    label: 'Error Boundaries',
    section: 'React Patterns',
  },
  { id: 'event-handlers', label: 'Event Handlers', section: 'React Patterns' },
  { id: 'fragments', label: 'Fragments', section: 'React Patterns' },
  { id: 'h-o-cs', label: 'HOCs', section: 'React Patterns' },
  { id: 'lists', label: 'Lists', section: 'React Patterns' },
  {
    id: 'member-expressions',
    label: 'Member Expressions',
    section: 'React Patterns',
  },
  { id: 'memo', label: 'Memo', section: 'React Patterns' },
  { id: 'ref-patterns', label: 'Ref Patterns', section: 'React Patterns' },
  { id: 'render-props', label: 'Render Props', section: 'React Patterns' },
  { id: 'self-closing', label: 'Self Closing', section: 'React Patterns' },
  {
    id: 'lazy-loading',
    label: 'Lazy Loading',
    section: 'Rendering & Runtime',
  },
  { id: 'portals', label: 'Portals', section: 'Rendering & Runtime' },
  {
    id: 'react18-features',
    label: 'React 18 Features',
    section: 'Rendering & Runtime',
  },
  {
    id: 's-s-r-hydration',
    label: 'SSR Hydration',
    section: 'Rendering & Runtime',
  },
  { id: 's-v-g-elements', label: 'SVG Elements', section: 'Rendering & Runtime' },
  { id: 'styling', label: 'Styling', section: 'Rendering & Runtime' },
  {
    id: 'type-script-features',
    label: 'TypeScript Features',
    section: 'Rendering & Runtime',
  },
  { id: 'smoke-test', label: 'Smoke Test', section: 'Validierung' },
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
            <span className="sidebar-logo-text">PinFlow Demo</span>
            <span className="sidebar-logo-subtext">
              React-Vorschau fuer Auswahl, Mapping und Kommentare
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
