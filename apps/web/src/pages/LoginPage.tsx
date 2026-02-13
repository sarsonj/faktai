import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const profile = await login(email, password);
      const fallback = profile.hasSubject ? '/invoices' : '/onboarding/subject';
      const nextPath = location.state?.from?.pathname ?? fallback;
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Přihlášení selhalo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="form-stack auth-form">
      <div className="auth-form-head">
        <h2>Přihlášení</h2>
        <p>Použijte e-mail a heslo k pokračování do aplikace.</p>
      </div>

      <label>
        E-mail
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label>
        Heslo
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="auth-form-actions">
        <button disabled={loading} type="submit">
          {loading ? 'Přihlašuji...' : 'Přihlásit se'}
        </button>
        <Link to="/auth/forgot-password">Zapomenuté heslo</Link>
      </div>
    </form>
  );
}
