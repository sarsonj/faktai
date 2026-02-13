import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="app-shell">
      <section className="card">
        <h1>404</h1>
        <p>Stránka nebyla nalezena.</p>
        <Link to="/invoices">Zpět na faktury</Link>
      </section>
    </main>
  );
}
