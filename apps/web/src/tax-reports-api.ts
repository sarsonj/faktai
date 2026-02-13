import { API_BASE_URL, ApiError, apiRequest } from './lib-api';
import type { TaxReportPreview, TaxReportRequest, TaxReportRun } from './types';

export async function previewTaxReport(payload: TaxReportRequest): Promise<TaxReportPreview> {
  return apiRequest<TaxReportPreview>('/tax-reports/preview', {
    method: 'POST',
    body: payload,
  });
}

export async function listTaxReportRuns(query: Partial<TaxReportRequest> = {}): Promise<TaxReportRun[]> {
  const search = new URLSearchParams();

  if (query.reportType) search.set('reportType', query.reportType);
  if (query.periodType) search.set('periodType', query.periodType);
  if (query.year) search.set('year', String(query.year));
  if (query.value) search.set('value', String(query.value));

  const suffix = search.toString();
  return apiRequest<TaxReportRun[]>(`/tax-reports/runs${suffix ? `?${suffix}` : ''}`);
}

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
