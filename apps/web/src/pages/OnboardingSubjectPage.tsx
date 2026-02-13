import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SubjectForm } from '../components/SubjectForm';
import { ApiError } from '../lib-api';
import { createSubject, getSubject } from '../subject-api';
import type { SubjectInput } from '../types';

export function OnboardingSubjectPage() {
  const navigate = useNavigate();
  const { refreshMe, logout } = useAuth();
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
    await createSubject(payload);
    await refreshMe();
    navigate('/invoices', { replace: true });
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
      <section className="card">
        <h1>Onboarding živnostníka</h1>
        <p>Vyplňte profil subjektu pro fakturaci.</p>
        {error && <p className="error">{error}</p>}
        <SubjectForm loading={saving} onSubmit={onSubmit} submitLabel="Uložit a pokračovat" />
        <hr />
        <button
          onClick={async () => {
            await logout();
            navigate('/auth/login', { replace: true });
          }}
          type="button"
        >
          Odhlásit
        </button>
      </section>
    </main>
  );
}
