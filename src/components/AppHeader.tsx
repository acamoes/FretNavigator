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
        <span className="app-header__tag">practice tool</span>
      </div>
    </header>
  );
}
