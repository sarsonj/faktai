import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, password, passwordConfirm);
      navigate('/onboarding/subject', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrace selhala');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="form-stack auth-form">
      <div className="auth-form-head">
        <h2>Registrace</h2>
        <p>Vytvořte účet a pokračujte do onboardingu subjektu.</p>
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
      {error && <p className="error">{error}</p>}
      <div className="auth-form-actions">
        <button disabled={loading} type="submit">
          {loading ? 'Vytvářím účet...' : 'Vytvořit účet'}
        </button>
      </div>
    </form>
  );
}
