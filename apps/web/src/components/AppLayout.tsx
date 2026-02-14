import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_SHORT_NAME } from '../brand';

const NAV_ITEMS = [
  { to: '/invoices', label: 'Vydané faktury' },
  { to: '/tax-reports', label: 'DPH podklady' },
  { to: '/settings/subject', label: 'Nastavení subjektu' },
];

export function AppLayout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link to="/invoices" className="app-brand">
          <img src="/branding/faktai-logo-dark.png" alt={APP_SHORT_NAME} className="app-brand-image" />
        </Link>
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
        <header className="app-topbar app-topbar-compact">
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
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
