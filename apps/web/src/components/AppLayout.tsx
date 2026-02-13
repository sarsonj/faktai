import { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { APP_SHORT_NAME } from '../brand';
import { SiteHeader } from './SiteHeader';

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
  const location = useLocation();

  const sectionLabel = useMemo(() => resolveSectionLabel(location.pathname), [location.pathname]);

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
        <SiteHeader sectionLabel={sectionLabel} />

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
