import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiRequest } from '../lib-api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setResult(response.message);
    } catch {
      setResult('Pokud účet existuje, poslali jsme instrukce.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="form-stack">
      <label>
        E-mail
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <button disabled={loading} type="submit">
        {loading ? 'Odesílám...' : 'Odeslat odkaz'}
      </button>
      {result && <p>{result}</p>}
    </form>
  );
}
