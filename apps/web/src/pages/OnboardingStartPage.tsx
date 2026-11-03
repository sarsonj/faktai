import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { APP_SHORT_NAME } from '../brand';
import { useAuth } from '../auth/auth-context';
import { PublicLayout } from '../components/PublicLayout';
import { Field } from '../components/app/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const STEPS = ['Účet', 'Subjekt a sídlo', 'DPH a platby'];

export function OnboardingStartPage() {
  const { me, loading, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && me) {
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
    <PublicLayout showGuestActions={false} width="narrow">
      <Card>
        <CardHeader>
          <ol className="m-0 mb-4 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm">
            {STEPS.map((step, index) => (
              <li key={step} className={index === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
          <CardTitle className="text-xl">Začínáme v {APP_SHORT_NAME}</CardTitle>
          <CardDescription>Vytvořte účet, pak společně nastavíme váš profil pro fakturaci.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
            <Field id="email" label="E-mail">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="password" label="Heslo" hint="Alespoň 8 znaků.">
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
            </div>
            {error && (
              <p role="alert" className="m-0 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Link to="/auth/login" className="text-sm">
                Už mám účet
              </Link>
              <Button type="submit" disabled={submitting || loading}>
                {submitting && <Loader2 className="animate-spin" />}
                Vytvořit účet a pokračovat
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
