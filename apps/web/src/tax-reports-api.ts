import { API_BASE_URL, ApiError } from './lib-api';
import type { TaxReportRequest } from './types';

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
