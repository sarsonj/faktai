import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_SHORT_NAME } from '../brand';

const NAV_ITEMS = [
  { to: '/invoices', label: 'Vydané faktury' },
  { to: '/tax-reports', label: 'DPH podklady' },
  { to: '/settings/subject', label: 'Nastavení subjektu' },
];

function resolveSectionLabel(pathname: string): string {
  if (pathname.startsWith('/invoices')) {
    return 'Fakturace';
  }
  if (pathname.startsWith('/tax-reports')) {
    return 'Daňové podklady';
  }
  if (pathname.startsWith('/settings/subject')) {
    return 'Nastavení';
  }
  return 'Aplikace';
}

export function AppLayout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const sectionLabel = useMemo(() => resolveSectionLabel(location.pathname), [location.pathname]);
  const avatarText = (me?.email?.trim().charAt(0) || 'U').toUpperCase();

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

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="app-brand">{APP_SHORT_NAME}</div>
        <p className="app-sidebar-caption">Hlavní menu</p>
        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <p className="app-topbar-kicker">Přehled sekce</p>
            <p className="app-topbar-title">{sectionLabel}</p>
          </div>

          <div className="app-user-menu" ref={menuRef}>
            <button
              type="button"
              className="app-user-trigger"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span className="app-avatar">{avatarText}</span>
              <span className="app-user-label">{me?.email}</span>
            </button>

            {menuOpen && (
              <div className="app-user-dropdown">
                <p className="app-user-email">{me?.email}</p>
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
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
