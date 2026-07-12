import { useState } from 'react';

interface Props {
  /** Optional breadcrumb-style context shown next to the brand. */
  context?: string;
  onHome?: () => void;
}

/** Persistent top bar shown on every screen. */
export function AppHeader({ context, onHome }: Props) {
  // Show the user's logo from /public; fall back to the inline wordmark if the
  // file isn't present (or fails to load).
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="app-header no-print">
      <div className="app-header__inner">
        <button type="button" className="app-header__brand" onClick={onHome} title="Home">
          {logoOk ? (
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="FretNavigator"
              className="app-header__logo-img"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <>
              <svg className="app-header__logo" viewBox="0 0 28 28" aria-hidden="true">
                <rect x="1.5" y="4" width="25" height="20" rx="3" className="logo-board" />
                {[7, 12, 17, 22].map((x) => (
                  <line key={x} x1={x} y1="4" x2={x} y2="24" className="logo-fret" />
                ))}
                {[8, 12, 16, 20].map((y) => (
                  <line key={y} x1="1.5" y1={y} x2="26.5" y2={y} className="logo-string" />
                ))}
                <circle cx="9.5" cy="12" r="2.4" className="logo-dot" />
              </svg>
              <span className="app-header__name">
                Fret<span className="app-header__accent">Navigator</span>
              </span>
            </>
          )}
        </button>
        {context && (
          <>
            <span className="app-header__sep">/</span>
            <span className="app-header__context">{context}</span>
          </>
        )}
        <a
          className="app-header__github"
          href="https://github.com/acamoes/FretNavigator"
          target="_blank"
          rel="noopener noreferrer"
          title="View source on GitHub"
          aria-label="View source on GitHub"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" width="20" height="20">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                 -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                 .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                 -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
                 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
                 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
                 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
        </a>
      </div>
    </header>
  );
}
