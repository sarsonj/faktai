import { Link, Outlet } from 'react-router-dom';
import { APP_SHORT_NAME, APP_TAGLINE } from '../brand';
import { SiteHeader } from './SiteHeader';

export function AuthLayout() {
  return (
    <main className="app-shell auth-shell">
      <div className="page-stack auth-page-stack">
        <SiteHeader />
        <section className="card auth-card">
          <div className="auth-layout">
            <aside className="auth-aside">
              <p className="page-kicker">{APP_SHORT_NAME}</p>
              <h1 className="page-title">{APP_TAGLINE}</h1>
              <p className="page-subtitle">
                Přihlaste se ke svému účtu a pokračujte ve správě faktur, DPH podkladů a nastavení podnikání.
              </p>
              <ul className="auth-benefits">
                <li>Rychlé vystavení dokladu v roční číselné řadě</li>
                <li>Export PDF a XML pro finanční úřad</li>
                <li>Onboarding s načtením dat z registrů</li>
              </ul>
            </aside>

            <div className="auth-panel">
              <Outlet />
              <hr />
              <p className="auth-switch">
                <Link to="/auth/login">Přihlášení</Link> | <Link to="/onboarding/start">Začít onboarding</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
