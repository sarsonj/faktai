import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function InvoicesPage() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Vydané faktury</h1>
        <p>Přihlášený uživatel: {me?.email}</p>
        <p>Iterace 2 dokončena. V další iteraci doplním tabulku faktur.</p>
        <p>
          <Link to="/settings/subject">Nastavení subjektu</Link>
        </p>
        <button onClick={onLogout} type="button">
          Odhlásit
        </button>
      </section>
    </main>
  );
}
