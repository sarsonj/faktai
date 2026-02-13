import { Link, Outlet, useLocation } from 'react-router-dom';
import { APP_SHORT_NAME, APP_TAGLINE } from '../brand';
import { LANDING_HIGHLIGHTS } from '../landing-copy';
import { SiteHeader } from './SiteHeader';

export function AuthLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/auth/login';

  return (
    <main className="app-shell auth-shell">
      <div className="page-stack auth-page-stack">
        <SiteHeader showGuestActions={false} />
        <section className="card auth-card">
          <div className="auth-layout">
            <aside className="auth-aside">
              <p className="page-kicker">{APP_SHORT_NAME}</p>
              <h1 className="page-title">{APP_TAGLINE}</h1>
              <p className="page-subtitle">
                Přihlaste se ke svému účtu a pokračujte ve správě faktur, DPH podkladů a nastavení podnikání.
              </p>
              <ul className="auth-benefits">
                {LANDING_HIGHLIGHTS.map((item) => (
                  <li key={item.title}>{item.title}</li>
                ))}
              </ul>
            </aside>

            <div className="auth-panel">
              <Outlet />
              <hr />
              <p className="auth-switch">
                {!isLoginPage && <Link to="/auth/login">Přihlášení</Link>}
                {!isLoginPage && ' | '}
                <Link to="/onboarding/start">Vytvořit účet</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
