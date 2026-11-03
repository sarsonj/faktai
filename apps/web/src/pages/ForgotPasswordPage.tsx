import { useState, type FormEvent } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { apiRequest } from '../lib-api';
import { AuthFormHeader } from '../components/AuthFormHeader';
import { Field } from '../components/app/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <AuthFormHeader
        title="Zapomenuté heslo"
        description="Zadejte e-mail a pošleme vám odkaz pro nastavení nového hesla."
      />
      <Field id="email" label="E-mail">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Odeslat odkaz
      </Button>
      {result && (
        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
          <MailCheck className="size-4 text-primary" aria-hidden="true" />
          {result}
        </p>
      )}
    </form>
  );
}
