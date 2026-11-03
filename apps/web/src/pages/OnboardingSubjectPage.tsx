import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { APP_SHORT_NAME } from '../brand';
import { OnboardingSubjectWizard } from '../components/OnboardingSubjectWizard';
import { PublicLayout } from '../components/PublicLayout';
import { ApiError } from '../lib-api';
import { createSubject, getSubject } from '../subject-api';
import type { SubjectInput } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function OnboardingSubjectPage() {
  const navigate = useNavigate();
  const { me, refreshMe } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getSubject()
      .then(() => {
        if (!ignore) navigate('/invoices', { replace: true });
      })
      .catch((err: unknown) => {
        if (ignore) return;
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(err instanceof Error ? err.message : 'Načtení subjektu selhalo');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [navigate]);

  const onSubmit = async (payload: SubjectInput) => {
    setSaving(true);
    try {
      await createSubject(payload);
      await refreshMe();
      navigate('/invoices', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicLayout showGuestActions={false} width="narrow">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nastavení profilu</CardTitle>
          <CardDescription>
            Ve 3 krocích doplníme údaje pro fakturaci. Pak můžete v {APP_SHORT_NAME} začít vystavovat faktury.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="m-0 text-muted-foreground">Načítám…</p>
          ) : (
            <>
              {error && <p className="m-0 mb-4 text-sm text-destructive">{error}</p>}
              <OnboardingSubjectWizard
                loading={saving}
                onSubmit={onSubmit}
                submitLabel="Dokončit nastavení"
                initialContactEmail={me?.email}
              />
            </>
          )}
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
