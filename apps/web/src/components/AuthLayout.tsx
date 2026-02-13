import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="app-shell">
      <section className="card">
        <h1>TappyFaktur</h1>
        <p>Autentizace</p>
        <Outlet />
        <hr />
        <p>
          <Link to="/auth/login">Přihlášení</Link> | <Link to="/auth/register">Registrace</Link>
        </p>
      </section>
    </main>
  );
}
