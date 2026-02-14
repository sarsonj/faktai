import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { searchRegistryAddresses, searchRegistryCompanies } from '../registry-api';
import { getTaxOffices } from '../subject-api';
import type {
  RegistryAddressResult,
  RegistryCompanyResult,
  SubjectInput,
  TaxOfficeOption,
} from '../types';

type OnboardingSubjectWizardProps = {
  loading?: boolean;
  submitLabel: string;
  initialContactEmail?: string;
  onSubmit: (payload: SubjectInput) => Promise<void>;
};

type FormState = {
  firstName: string;
  lastName: string;
  businessName: string;
  ico: string;
  dic: string;
  isVatPayer: boolean;
  vatPeriodType: 'month' | 'quarter';
  vatRegistrationDate: string;
  taxOfficePracufo: string;
  contactPhone: string;
  contactEmail: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  bankAccountPrefix: string;
  bankAccountNumber: string;
  bankCode: string;
  defaultDueDays: string;
};

const STEPS = [
  { id: 0, title: 'Subjekt', subtitle: 'Najdeme firmu podle IČO nebo názvu' },
  { id: 1, title: 'Adresa', subtitle: 'Doplnění sídla a ověření adresy' },
  { id: 2, title: 'DPH a platby', subtitle: 'Daňový režim a bankovní údaje' },
];

function normalizeIco(value: string): string {
  return value.replace(/\s+/g, '');
}

function normalizePostalCode(value: string): string {
  return value.replace(/\s+/g, '');
}

function normalizeCountryCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function formatCompanyResult(item: RegistryCompanyResult): string {
  const location = [item.city, item.postalCode].filter(Boolean).join(', ');
  return [item.name, `IČO ${item.ico}`, location].filter(Boolean).join(' | ');
}

function formatAddressResult(item: RegistryAddressResult): string {
  const basic = [item.street, item.city, item.postalCode].filter(Boolean).join(', ');
  return basic || item.displayName;
}

export function OnboardingSubjectWizard({
  loading = false,
  initialContactEmail,
  onSubmit,
  submitLabel,
}: OnboardingSubjectWizardProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<FormState>({
    firstName: '',
    lastName: '',
    businessName: '',
    ico: '',
    dic: '',
    isVatPayer: true,
    vatPeriodType: 'quarter',
    vatRegistrationDate: '',
    taxOfficePracufo: '',
    contactPhone: '',
    contactEmail: initialContactEmail ?? '',
    street: '',
    city: '',
    postalCode: '',
    countryCode: 'CZ',
    bankAccountPrefix: '',
    bankAccountNumber: '',
    bankCode: '',
    defaultDueDays: '14',
  });

  const [companyQuery, setCompanyQuery] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyResults, setCompanyResults] = useState<RegistryCompanyResult[]>([]);

  const [addressQuery, setAddressQuery] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressResults, setAddressResults] = useState<RegistryAddressResult[]>([]);
  const [taxOfficeOptions, setTaxOfficeOptions] = useState<TaxOfficeOption[]>([]);
  const [taxOfficeError, setTaxOfficeError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const items = await getTaxOffices();
        setTaxOfficeOptions(items);
      } catch (err) {
        setTaxOfficeError(
          err instanceof Error
            ? err.message
            : 'Načtení číselníku finančních úřadů selhalo.',
        );
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (!initialContactEmail) {
      return;
    }
    setState((current) => {
      if (current.contactEmail.trim()) {
        return current;
      }
      return { ...current, contactEmail: initialContactEmail };
    });
  }, [initialContactEmail]);

  const payload = useMemo<SubjectInput>(() => {
    return {
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      businessName: state.businessName.trim() || undefined,
      ico: state.ico.trim(),
      dic: state.isVatPayer ? state.dic.trim() || undefined : undefined,
      isVatPayer: state.isVatPayer,
      vatPeriodType: state.vatPeriodType,
      vatRegistrationDate: state.isVatPayer ? state.vatRegistrationDate || undefined : undefined,
      taxOfficePracufo: state.isVatPayer ? state.taxOfficePracufo || undefined : undefined,
      contactPhone: state.contactPhone.trim() || undefined,
      contactEmail: state.contactEmail.trim() || undefined,
      street: state.street.trim(),
      city: state.city.trim(),
      postalCode: state.postalCode.trim(),
      countryCode: state.countryCode.trim(),
      bankAccountPrefix: state.bankAccountPrefix.trim() || undefined,
      bankAccountNumber: state.bankAccountNumber.trim(),
      bankCode: state.bankCode.trim(),
      defaultVariableSymbolType: 'ico',
      defaultVariableSymbolValue: undefined,
      defaultDueDays: Number(state.defaultDueDays),
    };
  }, [state]);

  const applyCompanyResult = (item: RegistryCompanyResult) => {
    setState((current) => ({
      ...current,
      businessName: item.name || current.businessName,
      ico: item.ico || current.ico,
      dic: item.dic ?? '',
      street: item.street || current.street,
      city: item.city || current.city,
      postalCode: item.postalCode || current.postalCode,
      countryCode: item.countryCode || current.countryCode,
    }));
    setCompanyResults([]);
    setCompanyError(null);
  };

  const applyAddressResult = (item: RegistryAddressResult) => {
    setState((current) => ({
      ...current,
      street: item.street || current.street,
      city: item.city || current.city,
      postalCode: item.postalCode || current.postalCode,
      countryCode: item.countryCode || current.countryCode,
    }));
    setAddressResults([]);
    setAddressError(null);
  };

  const handleCompanySearch = async () => {
    const query = companyQuery.trim() || state.ico;
    if (!query) {
      setCompanyError('Zadejte IČO nebo název firmy.');
      return;
    }

    setCompanyLoading(true);
    setCompanyError(null);
    setCompanyResults([]);

    try {
      const items = await searchRegistryCompanies(query);
      setCompanyResults(items);
      if (items.length === 0) {
        setCompanyError('Firmu jsme v registru nenašli. Můžete pokračovat ručně.');
      }
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : 'Vyhledání v registru selhalo.');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleAddressSearch = async () => {
    const query = addressQuery.trim() || [state.street, state.city].filter(Boolean).join(' ');
    if (query.trim().length < 3) {
      setAddressError('Zadejte alespoň 3 znaky pro vyhledání adresy.');
      return;
    }

    setAddressLoading(true);
    setAddressError(null);
    setAddressResults([]);

    try {
      const items = await searchRegistryAddresses(query);
      setAddressResults(items);
      if (items.length === 0) {
        setAddressError('Adresu jsme nenašli. Pokračujte ručně.');
      }
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Vyhledání adresy selhalo.');
    } finally {
      setAddressLoading(false);
    }
  };

  const validateStep = (stepIndex: number): string | null => {
    if (stepIndex === 0) {
      if (!state.firstName.trim()) return 'Doplňte jméno.';
      if (!state.lastName.trim()) return 'Doplňte příjmení.';
      if (!/^\d{8}$/.test(state.ico.trim())) return 'IČO musí mít přesně 8 číslic.';
      return null;
    }

    if (stepIndex === 1) {
      if (!state.street.trim()) return 'Doplňte ulici.';
      if (!state.city.trim()) return 'Doplňte město.';
      if (!/^\d{5}$/.test(state.postalCode.trim())) return 'PSČ musí mít 5 číslic.';
      if (!/^[A-Z]{2}$/.test(state.countryCode.trim())) return 'Země musí být 2 písmena, např. CZ.';
      return null;
    }

    if (!state.bankAccountNumber.trim()) return 'Doplňte číslo bankovního účtu.';
    if (!/^\d{4}$/.test(state.bankCode.trim())) return 'Kód banky musí mít 4 číslice.';
    const dueDays = Number(state.defaultDueDays);
    if (!Number.isInteger(dueDays) || dueDays < 1 || dueDays > 90) {
      return 'Splatnost musí být celé číslo v rozsahu 1 až 90 dní.';
    }
    if (state.isVatPayer && !state.dic.trim()) return 'U plátce DPH je DIČ povinné.';
    if (state.isVatPayer && !state.vatRegistrationDate) return 'U plátce DPH doplňte datum registrace.';
    if (state.isVatPayer && !state.taxOfficePracufo) {
      return 'U plátce DPH vyberte místní příslušnost finančního úřadu.';
    }
    if (
      state.contactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contactEmail.trim())
    ) {
      return 'E-mail pro FÚ není ve správném formátu.';
    }
    if (
      state.contactPhone.trim() &&
      !/^[0-9+()\-\s]{6,25}$/.test(state.contactPhone.trim())
    ) {
      return 'Telefon pro FÚ může obsahovat pouze číslice, mezery a znaky + ( ) -.';
    }
    return null;
  };

  const goNext = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goPrev = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateStep(2);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení subjektu selhalo.');
    }
  };

  return (
    <form className="subject-form onboarding-wizard" onSubmit={handleSubmit}>
      <section className="ui-section">
        <div className="onboarding-steps">
          {STEPS.map((item) => (
            <article
              key={item.id}
              className={`onboarding-step${item.id === step ? ' active' : ''}${item.id < step ? ' done' : ''}`}
            >
              <p>Krok {item.id + 1}</p>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </article>
          ))}
        </div>
      </section>

      {step === 0 && (
        <section className="ui-section">
          <h2>Najděme váš subjekt</h2>
          <p className="helper-text">
            Zkuste nejdřív ARES. Pokud se záznam nenajde, můžete údaje jednoduše vyplnit ručně.
          </p>

          <section className="lookup-box">
            <h3>Načíst firmu z ARES</h3>
            <div className="lookup-controls">
              <input
                placeholder="IČO nebo název firmy"
                value={companyQuery}
                onChange={(event) => setCompanyQuery(event.target.value)}
              />
              <button
                type="button"
                className="secondary"
                disabled={companyLoading || loading}
                onClick={handleCompanySearch}
              >
                {companyLoading ? 'Načítám...' : 'Vyhledat'}
              </button>
            </div>
            {companyError && <p className="error">{companyError}</p>}
            {companyResults.length > 0 && (
              <ul className="lookup-results">
                {companyResults.map((item) => (
                  <li key={`${item.ico}-${item.name}`}>
                    <button type="button" className="secondary" onClick={() => applyCompanyResult(item)}>
                      Použít
                    </button>
                    <span>{formatCompanyResult(item)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="form-grid form-grid-two">
            <label>
              Obchodní název
              <input
                value={state.businessName}
                onChange={(event) => setState((current) => ({ ...current, businessName: event.target.value }))}
              />
            </label>
            <label>
              IČO
              <input
                value={state.ico}
                onChange={(event) =>
                  setState((current) => ({ ...current, ico: normalizeIco(event.target.value) }))
                }
                required
              />
            </label>
            <label>
              Jméno
              <input
                value={state.firstName}
                onChange={(event) => setState((current) => ({ ...current, firstName: event.target.value }))}
                required
              />
            </label>
            <label>
              Příjmení
              <input
                value={state.lastName}
                onChange={(event) => setState((current) => ({ ...current, lastName: event.target.value }))}
                required
              />
            </label>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="ui-section">
          <h2>Doplňte adresu sídla</h2>
          <p className="helper-text">
            Adresu můžete vyhledat podle ulice a čísla, nebo ji vyplnit ručně.
          </p>

          <section className="lookup-box">
            <h3>Načíst adresu</h3>
            <div className="lookup-controls">
              <input
                placeholder="Ulice a číslo"
                value={addressQuery}
                onChange={(event) => setAddressQuery(event.target.value)}
              />
              <button
                type="button"
                className="secondary"
                disabled={addressLoading || loading}
                onClick={handleAddressSearch}
              >
                {addressLoading ? 'Načítám...' : 'Vyhledat adresu'}
              </button>
            </div>
            {addressError && <p className="error">{addressError}</p>}
            {addressResults.length > 0 && (
              <ul className="lookup-results">
                {addressResults.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="secondary" onClick={() => applyAddressResult(item)}>
                      Použít
                    </button>
                    <span>{formatAddressResult(item)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="form-grid form-grid-two">
            <label>
              Ulice
              <input
                value={state.street}
                onChange={(event) => setState((current) => ({ ...current, street: event.target.value }))}
                required
              />
            </label>
            <label>
              Město
              <input
                value={state.city}
                onChange={(event) => setState((current) => ({ ...current, city: event.target.value }))}
                required
              />
            </label>
            <label>
              PSČ
              <input
                value={state.postalCode}
                onChange={(event) =>
                  setState((current) => ({ ...current, postalCode: normalizePostalCode(event.target.value) }))
                }
                required
              />
            </label>
            <label>
              Země
              <input
                value={state.countryCode}
                onChange={(event) =>
                  setState((current) => ({ ...current, countryCode: normalizeCountryCode(event.target.value) }))
                }
                required
              />
            </label>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="ui-section">
          <h2>DPH a platební údaje</h2>
          <p className="helper-text">
            Poslední krok. Variabilní symbol se bude u nové faktury předvyplňovat podle čísla dokladu.
          </p>

          <div className="form-grid form-grid-two">
            <label className="checkbox-row">
              <span>Jsem plátce DPH</span>
              <input
                checked={state.isVatPayer}
                onChange={(event) => setState((current) => ({ ...current, isVatPayer: event.target.checked }))}
                type="checkbox"
              />
            </label>

            <label>
              Splatnost (dny)
              <input
                type="number"
                min={1}
                max={90}
                value={state.defaultDueDays}
                onChange={(event) => setState((current) => ({ ...current, defaultDueDays: event.target.value }))}
                required
              />
            </label>

            {state.isVatPayer && (
              <label>
                DIČ
                <input
                  value={state.dic}
                  onChange={(event) => setState((current) => ({ ...current, dic: event.target.value }))}
                  required={state.isVatPayer}
                />
              </label>
            )}

            {state.isVatPayer && (
              <label>
                Datum registrace DPH
                <input
                  type="date"
                  value={state.vatRegistrationDate}
                  onChange={(event) =>
                    setState((current) => ({ ...current, vatRegistrationDate: event.target.value }))
                  }
                  required={state.isVatPayer}
                />
              </label>
            )}

            {state.isVatPayer && (
              <label>
                Periodicita DPH
                <select
                  value={state.vatPeriodType}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      vatPeriodType: event.target.value as 'month' | 'quarter',
                    }))
                  }
                >
                  <option value="month">Měsíční</option>
                  <option value="quarter">Čtvrtletní</option>
                </select>
              </label>
            )}

            {state.isVatPayer && (
              <label>
                Místní příslušnost FÚ
                <select
                  value={state.taxOfficePracufo}
                  onChange={(event) =>
                    setState((current) => ({ ...current, taxOfficePracufo: event.target.value }))
                  }
                  required={state.isVatPayer}
                >
                  <option value="">Vyberte finanční úřad</option>
                  {taxOfficeOptions.map((item) => (
                    <option key={item.pracufo} value={item.pracufo}>
                      {item.name} ({item.pracufo})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Telefon pro FÚ (volitelné)
              <input
                value={state.contactPhone}
                onChange={(event) =>
                  setState((current) => ({ ...current, contactPhone: event.target.value }))
                }
                placeholder="+420 777 123 456"
              />
            </label>

            <label>
              E-mail pro FÚ (volitelné)
              <input
                type="email"
                value={state.contactEmail}
                onChange={(event) =>
                  setState((current) => ({ ...current, contactEmail: event.target.value }))
                }
                placeholder="kontakt@example.cz"
              />
            </label>

            <label>
              Prefix účtu
              <input
                value={state.bankAccountPrefix}
                onChange={(event) =>
                  setState((current) => ({ ...current, bankAccountPrefix: event.target.value }))
                }
              />
            </label>

            <label>
              Číslo účtu
              <input
                value={state.bankAccountNumber}
                onChange={(event) =>
                  setState((current) => ({ ...current, bankAccountNumber: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Kód banky
              <input
                value={state.bankCode}
                onChange={(event) => setState((current) => ({ ...current, bankCode: event.target.value }))}
                required
              />
            </label>
          </div>
          <p className="helper-text">
            Kontaktní údaje pro FÚ nejsou povinné, ale doporučujeme je vyplnit pro případný zpětný kontakt.
          </p>
        </section>
      )}

      {error && <p className="error">{error}</p>}
      {taxOfficeError && <p className="error">{taxOfficeError}</p>}

      <div className="button-row">
        {step > 0 && (
          <button type="button" className="secondary" onClick={goPrev} disabled={loading}>
            Zpět
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" onClick={goNext} disabled={loading}>
            Pokračovat
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button type="submit" disabled={loading}>
            {loading ? 'Ukládám...' : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
