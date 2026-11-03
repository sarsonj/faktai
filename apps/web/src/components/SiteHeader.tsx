import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { APP_SHORT_NAME } from '../brand';

type SiteHeaderProps = {
  sectionLabel?: string;
  className?: string;
  showGuestActions?: boolean;
};

export function SiteHeader({
  sectionLabel,
  className,
  showGuestActions = true,
}: SiteHeaderProps) {
  const { me, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Menu je otevřené jen na cestě, kde bylo otevřeno – při navigaci se tak samo zavře.
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const menuOpen = menuOpenPath === location.pathname;
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpenPath(null);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const homeTarget = !me ? '/' : me.hasSubject ? '/invoices' : '/onboarding/subject';
  const avatarText = (me?.email?.trim().charAt(0) || 'U').toUpperCase();

  return (
    <header className={`app-topbar site-header${className ? ` ${className}` : ''}`}>
      <div className="site-header-left">
        <Link to={homeTarget} className="site-logo-link">
          <img src="/branding/faktai-logo.png" alt={APP_SHORT_NAME} className="site-logo-image" />
        </Link>
        {sectionLabel && (
          <div>
            <p className="app-topbar-kicker">Přehled sekce</p>
            <p className="app-topbar-title">{sectionLabel}</p>
          </div>
        )}
      </div>

      {loading && (
        <button type="button" disabled className="secondary">
          Načítám...
        </button>
      )}

      {!loading && !me && showGuestActions && (
        <div className="site-auth-links">
          <Link to="/auth/login" className="action-link secondary-link">
            Přihlášení
          </Link>
          <Link to="/onboarding/start" className="action-link">
            Vytvořit účet
          </Link>
        </div>
      )}

      {!loading && me && (
        <div className="app-user-menu" ref={menuRef}>
          <button
            type="button"
            className="app-user-trigger"
            onClick={() => setMenuOpenPath(menuOpen ? null : location.pathname)}
          >
            <span className="app-avatar">{avatarText}</span>
            <span className="app-user-label">{me.email}</span>
          </button>

          {menuOpen && (
            <div className="app-user-dropdown">
              <p className="app-user-email">{me.email}</p>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  void logout();
                  navigate('/', { replace: true });
                }}
              >
                Odhlásit
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
