import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { APP_SHORT_NAME } from '../brand';
import { useAuth } from '../auth/AuthContext';
import { SiteHeader } from '../components/SiteHeader';

export function OnboardingStartPage() {
  const { me, loading, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="app-shell">
        <div className="page-stack">
          <SiteHeader showGuestActions={false} />
          <section className="card">Načítám onboarding...</section>
        </div>
      </main>
    );
  }

  if (me) {
    return <Navigate to={me.hasSubject ? '/invoices' : '/onboarding/subject'} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(email, password, passwordConfirm);
      navigate('/onboarding/subject', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrace selhala');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="page-stack">
        <SiteHeader showGuestActions={false} />
        <section className="card">
          <header className="page-head">
            <div>
              <p className="page-kicker">První kroky</p>
              <h1 className="page-title">Začínáme v {APP_SHORT_NAME}</h1>
              <p className="page-subtitle">
                Vytvořte účet a hned navážeme krokovým nastavením subjektu.
              </p>
            </div>
          </header>

          <section className="ui-section">
            <div className="onboarding-steps">
              <article className="onboarding-step active">
                <p>Krok 1</p>
                <strong>Vytvoření účtu</strong>
                <small>E-mail a heslo</small>
              </article>
              <article className="onboarding-step">
                <p>Krok 2</p>
                <strong>Subjekt a adresa</strong>
                <small>ARES + doplnění údajů</small>
              </article>
              <article className="onboarding-step">
                <p>Krok 3</p>
                <strong>DPH a platby</strong>
                <small>Daňové a bankovní nastavení</small>
              </article>
            </div>
          </section>

          <form className="subject-form" onSubmit={onSubmit}>
            <section className="ui-section">
              <h2>Vytvoření účtu</h2>
              <div className="form-grid onboarding-account-form">
                <label>
                  E-mail
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                  />
                </label>
                <label>
                  Heslo
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    required
                  />
                  <small>Minimálně 8 znaků (může být i heslová fráze).</small>
                </label>
                <label>
                  Potvrzení hesla
                  <input
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    type="password"
                    required
                  />
                </label>
              </div>
            </section>

            {error && <p className="error">{error}</p>}

            <div className="button-row">
              <button disabled={submitting} type="submit">
                {submitting ? 'Vytvářím účet...' : 'Pokračovat na nastavení subjektu'}
              </button>
              <Link className="action-link secondary-link" to="/auth/login">
                Už mám účet
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
