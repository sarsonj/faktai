import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function OnboardingSubjectPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Onboarding živnostníka</h1>
        <p>Scope 1 bude doplněn v následující iteraci.</p>
        <div className="button-row">
          <button
            onClick={() => {
              navigate('/invoices');
            }}
            type="button"
          >
            Pokračovat (placeholder)
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate('/auth/login', { replace: true });
            }}
            type="button"
          >
            Odhlásit
          </button>
        </div>
      </section>
    </main>
  );
}
