import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { SubjectInput, SubjectProfile } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressFields, CompanyLookup, IdentityFields, PaymentFields, VatFields } from '../features/subject/SubjectSections';
import { toInitialState, toSubjectInput, validateAll, type SubjectFormState } from '../features/subject/subject-form-state';

type SubjectFormProps = {
  initial?: SubjectProfile;
  submitLabel: string;
  loading?: boolean;
  showRegistryLookup?: boolean;
  onSubmit: (payload: SubjectInput) => Promise<void>;
};

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Formulář subjektu pro nastavení – všechny sekce najednou, jedno uložení. */
export function SubjectForm({ initial, submitLabel, loading = false, showRegistryLookup = true, onSubmit }: SubjectFormProps) {
  const [state, setState] = useState<SubjectFormState>(() => toInitialState(initial));
  const [error, setError] = useState<string | null>(null);
  const patch = (next: Partial<SubjectFormState>) => setState((current) => ({ ...current, ...next }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateAll(state);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      await onSubmit(toSubjectInput(state));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení selhalo.');
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <Section title="Identifikace" description="Údaje, které se zobrazují na fakturách jako dodavatel.">
        <div className="flex flex-col gap-4">
          {showRegistryLookup && <CompanyLookup state={state} patch={patch} />}
          <IdentityFields state={state} patch={patch} disabled={loading} />
        </div>
      </Section>
      <Section title="Sídlo">
        <AddressFields state={state} patch={patch} disabled={loading} withLookup={showRegistryLookup} />
      </Section>
      <Section title="DPH a finanční úřad">
        <VatFields state={state} patch={patch} disabled={loading} />
      </Section>
      <Section title="Platby" description="Bankovní účet pro QR platbu a výchozí splatnost nových faktur.">
        <PaymentFields state={state} patch={patch} disabled={loading} />
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {error && (
          <p role="alert" className="m-0 mr-auto text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Save />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
