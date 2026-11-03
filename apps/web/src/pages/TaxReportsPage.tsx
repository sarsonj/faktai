import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileCode2, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportTaxReportXml, previewVatReturn } from '../tax-reports-api';
import { getSubject } from '../subject-api';
import { formatMoney } from '../lib/format';
import { PageHeader } from '../components/app/PageHeader';
import type { TaxPeriodType, TaxReportType } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

type Period = { periodType: TaxPeriodType; year: number; value: number };

function previousPeriod(periodType: TaxPeriodType): Period {
  const now = new Date();
  const year = now.getFullYear();
  if (periodType === 'month') {
    const month = now.getMonth() + 1;
    return month === 1 ? { periodType, year: year - 1, value: 12 } : { periodType, year, value: month - 1 };
  }
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return quarter === 1 ? { periodType, year: year - 1, value: 4 } : { periodType, year, value: quarter - 1 };
}

function periodLabel(period: Period): string {
  return period.periodType === 'month'
    ? `${MONTHS[period.value - 1]} ${period.year}`
    : `${period.value}. čtvrtletí ${period.year}`;
}

/** Lhůta pro podání: 25. den po skončení období. */
function filingDeadline(period: Period): string {
  const endMonth = period.periodType === 'month' ? period.value : period.value * 3;
  const deadline = new Date(period.year, endMonth, 25);
  return deadline.toLocaleDateString('cs-CZ');
}

function PreviewRow({ label, row, value }: { label: string; row: string; value: string }) {
  if (Number(value) === 0) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">
        <span className="mr-2 inline-block w-10 text-xs tabular-nums">ř. {row}</span>
        {label}
      </dt>
      <dd className="m-0 font-medium tabular-nums">{formatMoney(value).replace(',00', '')}</dd>
    </div>
  );
}

function TaxReportsForm({ initialPeriodType }: { initialPeriodType: TaxPeriodType }) {
  const [period, setPeriod] = useState<Period>(() => previousPeriod(initialPeriodType));
  const [exporting, setExporting] = useState<TaxReportType | null>(null);
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const preview = useQuery({
    queryKey: ['tax-preview', period],
    queryFn: () => previewVatReturn(period),
    retry: false,
  });
  const rows = preview.data?.summary.rows;

  const onExport = async (reportType: TaxReportType) => {
    setExporting(reportType);
    try {
      await exportTaxReportXml({ ...period, reportType });
      toast.success('XML soubor byl vygenerován a stažen.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export XML selhal');
    } finally {
      setExporting(null);
    }
  };

  const periodValues =
    period.periodType === 'month'
      ? MONTHS.map((name, index) => ({ value: index + 1, label: `${String(index + 1).padStart(2, '0')} – ${name}` }))
      : [1, 2, 3, 4].map((q) => ({ value: q, label: `${q}. čtvrtletí` }));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-type">Období</Label>
            <Select
              value={period.periodType}
              onValueChange={(value) => setPeriod(previousPeriod(value as TaxPeriodType))}
            >
              <SelectTrigger id="period-type" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Měsíční</SelectItem>
                <SelectItem value="quarter">Čtvrtletní</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-value">{period.periodType === 'month' ? 'Měsíc' : 'Čtvrtletí'}</Label>
            <Select value={String(period.value)} onValueChange={(value) => setPeriod({ ...period, value: Number(value) })}>
              <SelectTrigger id="period-value" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodValues.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-year">Rok</Label>
            <Select value={String(period.year)} onValueChange={(value) => setPeriod({ ...period, year: Number(value) })}>
              <SelectTrigger id="period-year" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="m-0 ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" aria-hidden="true" />
            Lhůta pro podání: {filingDeadline(period)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Přiznání k DPH</CardTitle>
            <CardDescription>{periodLabel(period)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {preview.isPending ? (
              <p className="m-0 text-sm text-muted-foreground">Počítám…</p>
            ) : preview.isError ? (
              <p className="m-0 text-sm text-destructive">
                {preview.error instanceof Error ? preview.error.message : 'Náhled se nepodařilo spočítat.'}
              </p>
            ) : rows ? (
              <>
                <p className="m-0 text-sm text-muted-foreground">
                  {preview.data.invoiceCount === 0
                    ? 'V období nejsou žádné vystavené faktury.'
                    : `Z ${preview.data.invoiceCount} vystavených faktur`}
                </p>
                <dl className="m-0 divide-y">
                  <PreviewRow row="1" label="Základ 21 %" value={rows.r1_base} />
                  <PreviewRow row="1" label="Daň 21 %" value={rows.r1_vat} />
                  <PreviewRow row="2" label="Základ 12 %" value={rows.r2_base} />
                  <PreviewRow row="2" label="Daň 12 %" value={rows.r2_vat} />
                  <PreviewRow row="20" label="Dodání zboží do EU" value={rows.r20_euGoods} />
                  <PreviewRow row="21" label="Služby do EU" value={rows.r21_euServices} />
                  <PreviewRow row="22" label="Vývoz" value={rows.r22_export} />
                  <PreviewRow row="25" label="Přenesení daňové povinnosti" value={rows.r25_reverseCharge} />
                  <PreviewRow row="50" label="Osvobozená plnění" value={rows.r50_exempt} />
                  <div className="flex items-baseline justify-between gap-4 pt-2.5">
                    <dt className="font-semibold">Daň k úhradě</dt>
                    <dd className="m-0 text-lg font-bold tabular-nums">{formatMoney(rows.r62_outputVat).replace(',00', '')}</dd>
                  </div>
                </dl>
              </>
            ) : null}
            <Button className="mt-auto" disabled={exporting !== null} onClick={() => void onExport('vat_return')}>
              {exporting === 'vat_return' ? <Loader2 className="animate-spin" /> : <Download />}
              Stáhnout XML přiznání
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kontrolní hlášení</CardTitle>
            <CardDescription>{periodLabel(period)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <p className="m-0 text-sm text-muted-foreground">
              Tuzemská plnění plátcům nad 10 000 Kč (A.4), ostatní souhrnně (A.5) a plnění v režimu přenesení
              daňové povinnosti (A.1). XML se před stažením ověří proti schématu finanční správy.
            </p>
            <Button
              variant="outline"
              className="mt-auto"
              disabled={exporting !== null}
              onClick={() => void onExport('control_statement')}
            >
              {exporting === 'control_statement' ? <Loader2 className="animate-spin" /> : <FileCode2 />}
              Stáhnout XML kontrolního hlášení
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TaxReportsPage() {
  const subject = useQuery({ queryKey: ['subject'], queryFn: getSubject });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="DPH podklady" description="XML podání pro finanční úřad z vystavených faktur." />
      {subject.isPending ? (
        <p className="m-0 text-muted-foreground">Načítám…</p>
      ) : subject.isError ? (
        <p className="m-0 text-destructive">
          {subject.error instanceof Error ? subject.error.message : 'Načtení subjektu selhalo'}
        </p>
      ) : !subject.data.isVatPayer ? (
        <Card>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <Info className="size-5" aria-hidden="true" />
            Nejste plátce DPH – přiznání k DPH ani kontrolní hlášení nepodáváte.
          </CardContent>
        </Card>
      ) : (
        <TaxReportsForm initialPeriodType={subject.data.vatPeriodType ?? 'quarter'} />
      )}
    </div>
  );
}
