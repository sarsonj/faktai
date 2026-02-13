import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_SHORT_NAME } from '../brand';

type SiteHeaderProps = {
  sectionLabel?: string;
  className?: string;
};

export function SiteHeader({ sectionLabel, className }: SiteHeaderProps) {
  const { me, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const homeTarget = !me ? '/' : me.hasSubject ? '/invoices' : '/onboarding/subject';
  const avatarText = (me?.email?.trim().charAt(0) || 'U').toUpperCase();

  return (
    <header className={`app-topbar site-header${className ? ` ${className}` : ''}`}>
      <div className="site-header-left">
        <Link to={homeTarget} className="site-logo-link">
          {APP_SHORT_NAME}
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

      {!loading && !me && (
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
            onClick={() => setMenuOpen((current) => !current)}
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
                onClick={async () => {
                  await logout();
                  navigate('/auth/login', { replace: true });
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
