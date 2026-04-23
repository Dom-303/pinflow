/**
 * Context - Tests React Context API
 *
 * Validates that PinFlow handles:
 * - createContext + Provider/Consumer
 * - useContext hook
 * - Nested providers with different values
 * - Context affecting element rendering
 */

import { createContext, useContext, useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

// Theme context
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemedButton() {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error('ThemedButton must be used within ThemeProvider');

  return (
    <button
      className={`themed-button ${context.theme}`}
      onClick={context.toggleTheme}
    >
      Theme wechseln (aktuell: {context.theme})
    </button>
  );
}

// User context
interface User {
  name: string;
  role: 'admin' | 'user';
}

const UserContext = createContext<User | undefined>(undefined);

function UserDisplay() {
  const user = useContext(UserContext);

  return (
    <div className="user-display">
      {user ? (
        <>
          <p>Name: {user.name}</p>
          <p>Rolle: {user.role}</p>
        </>
      ) : (
        <p>Kein Benutzer angemeldet</p>
      )}
    </div>
  );
}

// Old-style Consumer pattern (still valid)
function UserConsumerExample() {
  return (
    <UserContext.Consumer>
      {(user) => (
        <div className="user-consumer">
          {user ? `Angemeldet als ${user.name}` : 'Gast'}
        </div>
      )}
    </UserContext.Consumer>
  );
}

// Nested contexts
const LanguageContext = createContext<'en' | 'es'>('en');

function NestedContextExample() {
  const lang = useContext(LanguageContext);
  const theme = useContext(ThemeContext);

  return (
    <div className="nested-context">
      <p>Sprache: {lang}</p>
      <p>Theme: {theme?.theme}</p>
    </div>
  );
}

export function Context() {
  const currentUser: User = { name: 'Alice', role: 'admin' };

  return (
    <div className="context">
      <ThemeProvider>
        <section>
          <h4>Theme Context (useContext-Hook)</h4>
          <div className="demo-box capture-widget">
            <CaptureIcon />
            <ThemedButton />
          </div>
        </section>

        <UserContext.Provider value={currentUser}>
          <section>
            <h4>Benutzerkontext (Provider & Consumer)</h4>
            <div className="demo-box capture-widget">
              <CaptureIcon />
              <UserDisplay />
              <UserConsumerExample />
            </div>
          </section>

          <LanguageContext.Provider value="es">
            <section>
              <h4>Verschachtelte Kontexte (mehrere Provider)</h4>
              <div className="demo-box capture-widget">
                <CaptureIcon />
                <NestedContextExample />
              </div>
            </section>
          </LanguageContext.Provider>

          <UserContext.Provider value={{ name: 'Bob', role: 'user' }}>
            <section>
              <h4>Verschachtelter Provider (anderer Wert)</h4>
              <div className="demo-box capture-widget">
                <CaptureIcon />
                <UserDisplay />
              </div>
            </section>
          </UserContext.Provider>
        </UserContext.Provider>
      </ThemeProvider>
    </div>
  );
}
