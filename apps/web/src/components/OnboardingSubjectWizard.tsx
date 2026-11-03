import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import type { SubjectInput } from '../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddressFields, CompanyLookup, IdentityFields, PaymentFields, VatFields } from '../features/subject/SubjectSections';
import {
  toInitialState,
  toSubjectInput,
  validateAddress,
  validateIdentity,
  validateVatAndPayment,
  type SubjectFormState,
} from '../features/subject/subject-form-state';

type OnboardingSubjectWizardProps = {
  loading?: boolean;
  submitLabel: string;
  initialContactEmail?: string;
  onSubmit: (payload: SubjectInput) => Promise<void>;
};

const STEPS = [
  { title: 'Subjekt', subtitle: 'Najdeme vás podle IČO nebo názvu', validate: validateIdentity },
  { title: 'Sídlo', subtitle: 'Adresa podnikání', validate: validateAddress },
  { title: 'DPH a platby', subtitle: 'Daňový režim a bankovní účet', validate: validateVatAndPayment },
];

/** Onboarding subjektu ve 3 krocích (sdílí sekce a validace s nastavením). */
export function OnboardingSubjectWizard({ loading = false, initialContactEmail, onSubmit, submitLabel }: OnboardingSubjectWizardProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SubjectFormState>(() => ({
    ...toInitialState(undefined, initialContactEmail),
    isVatPayer: true,
  }));
  const patch = (next: Partial<SubjectFormState>) => setState((current) => ({ ...current, ...next }));
  const isLast = step === STEPS.length - 1;

  const goNext = () => {
    const validationError = STEPS[step].validate(state);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLast) {
      goNext();
      return;
    }
    const validationError = STEPS.map((s) => s.validate(state)).find(Boolean) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      await onSubmit(toSubjectInput(state));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení subjektu selhalo.');
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {STEPS.map((item, index) => (
          <li key={item.title} className="flex flex-col gap-2">
            <span className={cn('h-1 rounded-full', index <= step ? 'bg-primary' : 'bg-muted')} aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {index < step && <Check className="size-3.5 text-primary" aria-hidden="true" />}
              <span className={index === step ? 'text-foreground' : 'text-muted-foreground'}>
                {index + 1}. {item.title}
              </span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">{item.subtitle}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <CompanyLookup state={state} patch={patch} />
          <IdentityFields state={state} patch={patch} disabled={loading} />
        </div>
      )}
      {step === 1 && <AddressFields state={state} patch={patch} disabled={loading} withLookup />}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <VatFields state={state} patch={patch} disabled={loading} />
          <PaymentFields state={state} patch={patch} disabled={loading} />
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => { setError(null); setStep((s) => s - 1); }}>
            <ArrowLeft />
            Zpět
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={loading}>
          {isLast ? (loading ? <Loader2 className="animate-spin" /> : <Check />) : null}
          {isLast ? submitLabel : 'Pokračovat'}
          {!isLast && <ArrowRight />}
        </Button>
      </div>
    </form>
  );
}
