import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTaxReportRuns, previewTaxReport, exportTaxReportXml } from '../tax-reports-api';
import { getSubject } from '../subject-api';
import type {
  TaxPeriodType,
  TaxReportPreview,
  TaxReportRequest,
  TaxReportRun,
  TaxReportType,
} from '../types';

const REPORT_OPTIONS: Array<{ value: TaxReportType; label: string }> = [
  { value: 'vat_return', label: 'Přiznání k DPH' },
  { value: 'summary_statement', label: 'Souhrnné hlášení' },
  { value: 'control_statement', label: 'Kontrolní hlášení' },
];

function currentYear(): number {
  return new Date().getFullYear();
}

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function TaxReportsPage() {
  const [subjectLoading, setSubjectLoading] = useState(true);
  const [isVatPayer, setIsVatPayer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TaxReportPreview | null>(null);
  const [runs, setRuns] = useState<TaxReportRun[]>([]);

  const [form, setForm] = useState<TaxReportRequest>({
    reportType: 'vat_return',
    periodType: 'month',
    year: currentYear(),
    value: currentMonth(),
  });

  const maxValue = useMemo(() => (form.periodType === 'month' ? 12 : 4), [form.periodType]);

  const reloadRuns = async () => {
    setRunsLoading(true);
    try {
      const payload = await listTaxReportRuns();
      setRuns(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Načtení historie exportů selhalo');
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      setSubjectLoading(true);
      setError(null);

      try {
        const subject = await getSubject();
        setIsVatPayer(subject.isVatPayer);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Načtení subjektu selhalo');
      } finally {
        setSubjectLoading(false);
      }
    };

    void run();
    void reloadRuns();
  }, []);

  const onPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await previewTaxReport(form);
      setPreview(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Výpočet podkladů selhal');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const onExport = async () => {
    setExporting(true);
    setError(null);

    try {
      await exportTaxReportXml(form);
      await reloadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export XML selhal');
    } finally {
      setExporting(false);
    }
  };

  if (subjectLoading) {
    return (
      <main className="app-shell">
        <section className="card">Načítám DPH podklady...</section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="card card-wide">
        <h1>DPH podklady</h1>
        <div className="toolbar-row">
          <Link to="/invoices">Vydané faktury</Link>
          <Link to="/settings/subject">Nastavení subjektu</Link>
        </div>

        {error && <p className="error">{error}</p>}

        {!isVatPayer && (
          <div>
            <p>Subjekt není plátce DPH, export XML je zablokovaný.</p>
          </div>
        )}

        {isVatPayer && (
          <>
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
                  onChange={(event) => {
                    const nextPeriod = event.target.value as TaxPeriodType;
                    setForm((current) => ({
                      ...current,
                      periodType: nextPeriod,
                      value: nextPeriod === 'month' ? Math.min(current.value, 12) : Math.min(current.value, 4),
                    }));
                  }}
                >
                  <option value="month">Měsíc</option>
                  <option value="quarter">Čtvrtletí</option>
                </select>
              </label>

              <label>
                Rok
                <input
                  type="number"
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
                Hodnota období
                <input
                  type="number"
                  min={1}
                  max={maxValue}
                  value={form.value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      value: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>

            <div className="button-row">
              <button type="button" disabled={loading} onClick={onPreview}>
                {loading ? 'Počítám...' : 'Vypočítat podklady'}
              </button>
              <button
                type="button"
                disabled={exporting || !preview}
                onClick={onExport}
              >
                {exporting ? 'Exportuji...' : 'Export XML'}
              </button>
            </div>

            {preview && (
              <div className="totals-box">
                <p>
                  <strong>Počet zahrnutých faktur:</strong> {preview.invoiceCount}
                </p>
                <p>
                  <strong>Verze schématu:</strong> {preview.schemaVersion}
                </p>
                <p>
                  <strong>Dataset hash:</strong> <code>{preview.datasetHash}</code>
                </p>
                <pre className="json-preview">{JSON.stringify(preview.summary, null, 2)}</pre>
              </div>
            )}
          </>
        )}

        <h2>Historie exportů</h2>
        {runsLoading && <p>Načítám historii...</p>}
        {!runsLoading && runs.length === 0 && <p>Zatím nebyl spuštěn žádný export.</p>}

        {!runsLoading && runs.length > 0 && (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Perioda</th>
                <th>Verze běhu</th>
                <th>Počet faktur</th>
                <th>Generováno</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{REPORT_OPTIONS.find((option) => option.value === run.reportType)?.label ?? run.reportType}</td>
                  <td>
                    {run.periodType === 'month'
                      ? `${run.periodYear}-${String(run.periodValue).padStart(2, '0')}`
                      : `${run.periodYear} / Q${run.periodValue}`}
                  </td>
                  <td>{run.runVersion}</td>
                  <td>{run.invoiceCount}</td>
                  <td>{new Date(run.generatedAt).toLocaleString('cs-CZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
