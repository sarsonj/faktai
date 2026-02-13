import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_SHORT_NAME } from '../brand';
import { OnboardingSubjectWizard } from '../components/OnboardingSubjectWizard';
import { SiteHeader } from '../components/SiteHeader';
import { ApiError } from '../lib-api';
import { createSubject, getSubject } from '../subject-api';
import type { SubjectInput } from '../types';

export function OnboardingSubjectPage() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        await getSubject();
        navigate('/invoices', { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Načtení subjektu selhalo');
        }
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [navigate]);

  const onSubmit = async (payload: SubjectInput) => {
    setSaving(true);
    setError(null);
    try {
      await createSubject(payload);
      await refreshMe();
      navigate('/invoices', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="app-shell">
        <section className="card">Načítám onboarding subjektu...</section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="page-stack">
        <SiteHeader />
        <section className="card">
          <header className="page-head">
            <div>
              <p className="page-kicker">Nastavení profilu</p>
              <h1 className="page-title">Pojďme nastavit váš profil</h1>
              <p className="page-subtitle">
                Projdeme to spolu ve 3 krocích. Jakmile profil uložíte, můžete v {APP_SHORT_NAME} začít vystavovat faktury.
              </p>
            </div>
          </header>
          {error && <p className="error">{error}</p>}
          <OnboardingSubjectWizard loading={saving} onSubmit={onSubmit} submitLabel="Dokončit nastavení profilu" />
        </section>
      </div>
    </main>
  );
}
