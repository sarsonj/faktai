import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { AuthFormHeader } from '../components/AuthFormHeader';
import { Field } from '../components/app/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      navigate(location.state?.from?.pathname ?? fallback, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Přihlášení selhalo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <AuthFormHeader title="Přihlášení" description="Pokračujte e-mailem a heslem." />
      <Field id="email" label="E-mail">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field id="password" label="Heslo">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Přihlásit se
      </Button>
      <Link to="/auth/forgot-password" className="self-center text-sm">
        Zapomenuté heslo
      </Link>
    </form>
  );
}
