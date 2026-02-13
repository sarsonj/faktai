import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SubjectForm } from '../components/SubjectForm';
import { getSubject, updateSubject } from '../subject-api';
import type { SubjectInput, SubjectProfile } from '../types';

export function SettingsSubjectPage() {
  const [subject, setSubject] = useState<SubjectProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const payload = await getSubject();
        setSubject(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Načtení subjektu selhalo');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const onSubmit = async (payload: SubjectInput) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateSubject(payload);
      setSubject(updated);
      setSuccess('Profil subjektu byl uložen.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení subjektu selhalo');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="app-shell">
        <section className="card">Načítám subjekt...</section>
      </main>
    );
  }

  if (!subject) {
    return (
      <main className="app-shell">
        <section className="card">
          <p className="error">Subjekt nebyl nalezen.</p>
          <Link to="/onboarding/subject">Přejít na onboarding</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Nastavení subjektu</h1>
        {error && <p className="error">{error}</p>}
        {success && <p>{success}</p>}
        <SubjectForm
          initial={subject}
          loading={saving}
          onSubmit={onSubmit}
          submitLabel="Uložit změny"
        />
      </section>
    </main>
  );
}
