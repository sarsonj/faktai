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
    return <section className="card card-narrow">Načítám subjekt...</section>;
  }

  if (!subject) {
    return (
      <section className="card card-narrow">
        <p className="error">Subjekt nebyl nalezen.</p>
        <Link to="/onboarding/subject">Přejít na onboarding</Link>
      </section>
    );
  }

  const subjectName = subject.businessName || `${subject.firstName} ${subject.lastName}`;
  const bankAccount = `${subject.bankAccountPrefix ? `${subject.bankAccountPrefix}-` : ''}${subject.bankAccountNumber}/${subject.bankCode}`;

  return (
    <section className="card card-narrow">
      <header className="page-head">
        <div>
          <p className="page-kicker">Nastavení</p>
          <h1 className="page-title">Nastavení subjektu</h1>
          <p className="page-subtitle">Úprava identifikačních, bankovních a daňových údajů pro fakturaci.</p>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      {success && <p>{success}</p>}
      <section className="ui-section">
        <div className="kpi-grid">
          <article className="kpi-card">
            <p>Subjekt</p>
            <strong>{subjectName}</strong>
          </article>
          <article className="kpi-card">
            <p>IČO / DIČ</p>
            <strong>{subject.ico}{subject.dic ? ` / ${subject.dic}` : ''}</strong>
          </article>
          <article className="kpi-card">
            <p>Režim DPH</p>
            <strong>{subject.isVatPayer ? (subject.vatPeriodType === 'month' ? 'Plátce (měsíčně)' : 'Plátce (čtvrtletně)') : 'Neplátce'}</strong>
          </article>
          <article className="kpi-card">
            <p>Bankovní účet</p>
            <strong>{bankAccount}</strong>
          </article>
        </div>
      </section>
      <SubjectForm
        initial={subject}
        loading={saving}
        showRegistryLookup={false}
        onSubmit={onSubmit}
        submitLabel="Uložit změny"
      />
    </section>
  );
}
