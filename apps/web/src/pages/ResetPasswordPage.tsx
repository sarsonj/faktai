import { useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib-api';
import { AuthFormHeader } from '../components/AuthFormHeader';
import { Field } from '../components/app/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') ?? '', [location.search]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest<{ success: boolean }>('/auth/reset-password', {
        method: 'POST',
        body: { token, password, passwordConfirm },
      });
      toast.success('Heslo bylo změněno, přihlaste se.');
      navigate('/auth/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset hesla selhal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <AuthFormHeader title="Nové heslo" description="Heslo musí mít alespoň 8 znaků, doporučujeme delší frázi." />
      <Field id="password" label="Nové heslo">
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field id="password-confirm" label="Potvrzení hesla">
        <Input
          id="password-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
      </Field>
      {(error || !token) && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error ?? 'Odkaz neobsahuje platný token. Požádejte o nový.'}
        </p>
      )}
      <Button type="submit" disabled={loading || !token}>
        {loading && <Loader2 className="animate-spin" />}
        Uložit nové heslo
      </Button>
    </form>
  );
}
