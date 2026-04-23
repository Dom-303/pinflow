/**
 * TypeScriptFeatures - Tests TypeScript-specific patterns
 *
 * Validates that PinFlow handles:
 * - Generic components
 * - Type assertions
 * - Interfaces and type aliases
 * - Optional chaining and nullish coalescing
 */

import { CaptureIcon } from './CaptureIcon';

interface User {
  id: number;
  name: string;
  email?: string;
}

interface GenericListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function GenericList<T extends { id: number }>({
  items,
  renderItem,
}: GenericListProps<T>) {
  return (
    <ul className="generic-list">
      {items.map((item) => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

type Theme = 'light' | 'dark' | 'auto';

interface ThemedComponentProps {
  theme: Theme;
  children: React.ReactNode;
}

function ThemedComponent({ theme, children }: ThemedComponentProps) {
  return <div className={`themed-component theme-${theme}`}>{children}</div>;
}

export function TypeScriptFeatures() {
  const users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ];

  const nullableValue: string | null = null;
  const undefinedValue: string | undefined = undefined;

  return (
    <div className="typescript-features">
      <section>
        <h4>Generische Komponente</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <GenericList
            items={users}
            renderItem={(user) => (
              <div>
                {user.name} - {user.email ?? 'Keine E-Mail'}
              </div>
            )}
          />
        </div>
      </section>

      <section>
        <h4>Optional Chaining & Nullish Coalescing</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div>
            <p>Erste Benutzer-E-Mail: {users[0]?.email ?? 'k. A.'}</p>
            <p>Nullable-Wert: {nullableValue ?? 'Standardwert'}</p>
            <p>Undefined-Wert: {undefinedValue ?? 'Standardwert'}</p>
          </div>
        </div>
      </section>

      <section>
        <h4>Union Types (Theme)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ThemedComponent theme="light">Inhalt fuer Light Theme</ThemedComponent>
          <ThemedComponent theme="dark">Inhalt fuer Dark Theme</ThemedComponent>
          <ThemedComponent theme="auto">Inhalt fuer automatisches Theme</ThemedComponent>
        </div>
      </section>

      <section>
        <h4>Type Narrowing</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {users.map((user) => (
            <div key={user.id}>
              {user.email ? (
                <a href={`mailto:${user.email}`}>{user.name}</a>
              ) : (
                <span>{user.name}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
