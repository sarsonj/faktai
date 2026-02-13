import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib-api';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const token = useMemo(() => new URLSearchParams(location.search).get('token') ?? '', [location.search]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      await apiRequest<{ success: boolean }>('/auth/reset-password', {
        method: 'POST',
        body: { token, password, passwordConfirm },
      });
      setResult('Heslo bylo změněno, přihlaste se.');
      setTimeout(() => navigate('/auth/login'), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset hesla selhal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="form-stack">
      <label>
        Nové heslo
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
      <button disabled={loading || !token} type="submit">
        {loading ? 'Ukládám...' : 'Uložit nové heslo'}
      </button>
      {result && <p>{result}</p>}
      {error && <p className="error">{error}</p>}
      {!token && <p className="error">Chybí reset token v URL.</p>}
    </form>
  );
}
