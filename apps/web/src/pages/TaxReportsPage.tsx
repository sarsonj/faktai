import { useEffect, useMemo, useState } from 'react';
import { exportTaxReportXml } from '../tax-reports-api';
import { getSubject } from '../subject-api';
import type { TaxPeriodType, TaxReportRequest, TaxReportType } from '../types';

const REPORT_OPTIONS: Array<{ value: TaxReportType; label: string }> = [
  { value: 'vat_return', label: 'Přiznání k DPH' },
  { value: 'control_statement', label: 'Kontrolní hlášení' },
];

const MONTH_OPTIONS = [
  { value: 1, label: '01 - leden' },
  { value: 2, label: '02 - únor' },
  { value: 3, label: '03 - březen' },
  { value: 4, label: '04 - duben' },
  { value: 5, label: '05 - květen' },
  { value: 6, label: '06 - červen' },
  { value: 7, label: '07 - červenec' },
  { value: 8, label: '08 - srpen' },
  { value: 9, label: '09 - září' },
  { value: 10, label: '10 - říjen' },
  { value: 11, label: '11 - listopad' },
  { value: 12, label: '12 - prosinec' },
];

const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1 (1. čtvrtletí)' },
  { value: 2, label: 'Q2 (2. čtvrtletí)' },
  { value: 3, label: 'Q3 (3. čtvrtletí)' },
  { value: 4, label: 'Q4 (4. čtvrtletí)' },
];

function currentYear(): number {
  return new Date().getFullYear();
}

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

function previousPeriod(periodType: TaxPeriodType): { year: number; value: number } {
  const now = new Date();
  const currentYear = now.getFullYear();

  if (periodType === 'month') {
    const currentMonthValue = now.getMonth() + 1;
    if (currentMonthValue === 1) {
      return { year: currentYear - 1, value: 12 };
    }
    return { year: currentYear, value: currentMonthValue - 1 };
  }

  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  if (currentQuarter === 1) {
    return { year: currentYear - 1, value: 4 };
  }
  return { year: currentYear, value: currentQuarter - 1 };
}

export function TaxReportsPage() {
  const [subjectLoading, setSubjectLoading] = useState(true);
  const [isVatPayer, setIsVatPayer] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<TaxReportRequest>({
    reportType: 'vat_return',
    periodType: 'month',
    year: currentYear(),
    value: currentMonth(),
  });

  const periodOptions = useMemo(
    () => (form.periodType === 'month' ? MONTH_OPTIONS : QUARTER_OPTIONS),
    [form.periodType],
  );

  useEffect(() => {
    const run = async () => {
      setSubjectLoading(true);
      setError(null);

      try {
        const subject = await getSubject();
        setIsVatPayer(subject.isVatPayer);
        const subjectPeriodType = subject.vatPeriodType ?? 'quarter';
        const previous = previousPeriod(subjectPeriodType);
        setForm((current) => ({
          ...current,
          periodType: subjectPeriodType,
          year: previous.year,
          value: previous.value,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Načtení subjektu selhalo');
      } finally {
        setSubjectLoading(false);
      }
    };

    void run();
  }, []);

  const onPeriodTypeChange = (periodType: TaxPeriodType) => {
    setForm((current) => {
      const options = periodType === 'month' ? MONTH_OPTIONS : QUARTER_OPTIONS;
      const currentExists = options.some((item) => item.value === current.value);
      return {
        ...current,
        periodType,
        value: currentExists ? current.value : options[0].value,
      };
    });
  };

  const onExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      await exportTaxReportXml(form);
      setSuccess('XML soubor byl vygenerován a stažen.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export XML selhal');
    } finally {
      setExporting(false);
    }
  };

  if (subjectLoading) {
    return <section className="card">Načítám DPH podklady...</section>;
  }

  return (
    <section className="card card-wide">
      <header className="page-head">
        <div>
          <p className="page-kicker">Daňové podklady</p>
          <h1 className="page-title">DPH podklady</h1>
          <p className="page-subtitle">Generování XML podání pro finanční úřad z aktuálních fakturačních dat.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {success && <p>{success}</p>}

      {!isVatPayer && (
        <div className="ui-section empty-state">
          <p>Subjekt není plátce DPH, export XML je zablokovaný.</p>
        </div>
      )}

      {isVatPayer && (
        <section className="ui-section">
          <h2>Nastavení exportu</h2>
          <div className="form-grid invoice-form-grid">
            <label>
              Typ podání
              <select
                value={form.reportType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reportType: event.target.value as TaxReportType,
                  }))
                }
              >
                {REPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Perioda
              <select
                value={form.periodType}
                onChange={(event) => onPeriodTypeChange(event.target.value as TaxPeriodType)}
              >
                <option value="month">Měsíc</option>
                <option value="quarter">Čtvrtletí</option>
              </select>
            </label>

            <label>
              Rok
              <input
                type="number"
                min={2000}
                max={2100}
                value={form.year}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    year: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              {form.periodType === 'month' ? 'Měsíc' : 'Kvartál'}
              <select
                value={String(form.value)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    value: Number(event.target.value),
                  }))
                }
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="button-row">
            <button type="button" disabled={exporting} onClick={onExport}>
              {exporting ? 'Exportuji...' : 'Export XML'}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
