import { API_BASE_URL, ApiError, apiRequest } from './lib-api';
import type { TaxReportPreview, TaxReportRequest } from './types';

export async function exportTaxReportXml(payload: TaxReportRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tax-reports/export`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const maybeJson = await response
      .json()
      .catch(() => ({ message: `Request failed with ${response.status}` }));
    throw new ApiError(response.status, maybeJson.message ?? `Request failed with ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const matchedName = disposition.match(/filename="([^"]+)"/);
  const fileName = matchedName?.[1] ?? 'tax-report.xml';

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type VatReturnPreviewRows = {
  r1_base: string;
  r1_vat: string;
  r2_base: string;
  r2_vat: string;
  r20_euGoods: string;
  r21_euServices: string;
  r22_export: string;
  r25_reverseCharge: string;
  r50_exempt: string;
  r62_outputVat: string;
};

export function previewVatReturn(
  payload: Omit<TaxReportRequest, 'reportType'>,
): Promise<TaxReportPreview & { summary: { rows: VatReturnPreviewRows } }> {
  return apiRequest('/tax-reports/preview', { method: 'POST', body: { ...payload, reportType: 'vat_return' } });
}
