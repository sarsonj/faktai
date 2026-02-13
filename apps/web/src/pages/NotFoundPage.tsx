import { Link } from 'react-router-dom';
import { SiteHeader } from '../components/SiteHeader';

export function NotFoundPage() {
  return (
    <main className="app-shell">
      <div className="page-stack">
        <SiteHeader />
        <section className="card">
          <h1>404</h1>
          <p>Stránka nebyla nalezena.</p>
          <Link to="/invoices">Zpět na faktury</Link>
        </section>
      </div>
    </main>
  );
}
