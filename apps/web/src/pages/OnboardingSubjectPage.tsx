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
      <section className="card">
        <header className="page-head">
          <div>
            <p className="page-kicker">Onboarding</p>
            <h1 className="page-title">Onboarding živnostníka</h1>
            <p className="page-subtitle">Vyplňte profil subjektu, aby šlo začít vystavovat faktury.</p>
          </div>
        </header>
        {error && <p className="error">{error}</p>}
        <SubjectForm loading={saving} onSubmit={onSubmit} submitLabel="Uložit a pokračovat" />
        <hr />
        <div className="button-row">
          <button
            onClick={async () => {
              await logout();
              navigate('/auth/login', { replace: true });
            }}
            type="button"
            className="secondary"
          >
            Odhlásit
          </button>
        </div>
      </section>
    </main>
  );
}
