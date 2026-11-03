import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SubjectForm } from '../components/SubjectForm';
import { PageHeader } from '../components/app/PageHeader';
import { getSubject, updateSubject } from '../subject-api';
import type { SubjectInput } from '../types';

export function SettingsSubjectPage() {
  const queryClient = useQueryClient();
  const subject = useQuery({ queryKey: ['subject'], queryFn: getSubject });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (payload: SubjectInput) => {
    setSaving(true);
    try {
      const updated = await updateSubject(payload);
      queryClient.setQueryData(['subject'], updated);
      toast.success('Údaje subjektu byly uloženy.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nastavení subjektu"
        description="Identifikační, daňové a bankovní údaje, které se propisují na nové faktury."
      />
      {subject.isPending ? (
        <p className="m-0 text-muted-foreground">Načítám subjekt…</p>
      ) : !subject.data ? (
        <div className="flex flex-col items-start gap-2">
          <p className="m-0 text-destructive">
            {subject.error instanceof Error ? subject.error.message : 'Subjekt nebyl nalezen.'}
          </p>
          <Link to="/onboarding/subject">Přejít na nastavení profilu</Link>
        </div>
      ) : (
        <SubjectForm
          initial={subject.data}
          loading={saving}
          showRegistryLookup={false}
          onSubmit={onSubmit}
          submitLabel="Uložit změny"
        />
      )}
      <p className="m-0 text-sm text-muted-foreground">
        Změny se projeví na nově vystavených fakturách. U již vystavené faktury lze údaje dodavatele aktualizovat
        v jejím detailu (menu „⋯“ → Aktualizovat údaje dodavatele).
      </p>
    </div>
  );
}
