import { API_BASE_URL, ApiError, apiRequest } from './lib-api';
import type { InvoiceDetail, InvoiceListResponse, InvoiceUpsertInput } from './types';

export type ListInvoicesQuery = {
  status: 'all' | 'paid' | 'unpaid' | 'overdue';
  q: string;
  page: number;
  pageSize: 10 | 20 | 50;
};

export async function listInvoices(query: ListInvoicesQuery): Promise<InvoiceListResponse> {
  const search = new URLSearchParams({
    status: query.status,
    q: query.q,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });

  return apiRequest<InvoiceListResponse>(`/invoices?${search.toString()}`);
}

export async function getInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}`);
}

export async function createInvoice(payload: InvoiceUpsertInput): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>('/invoices', {
    method: 'POST',
    body: payload,
  });
}

export async function reserveInvoiceNumber(issueDate?: string): Promise<{ invoiceNumber: string }> {
  return apiRequest<{ invoiceNumber: string }>('/invoices/reserve-number', {
    method: 'POST',
    body: issueDate ? { issueDate } : {},
  });
}

export async function updateInvoice(invoiceId: string, payload: InvoiceUpsertInput): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function copyInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}/copy`, {
    method: 'POST',
  });
}

export async function issueInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}/issue`, {
    method: 'POST',
  });
}

export async function markInvoicePaid(invoiceId: string, paidAt?: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/invoices/${invoiceId}/mark-paid`, {
    method: 'POST',
    body: paidAt ? { paidAt } : {},
  });
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  await apiRequest(`/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
}

export async function downloadInvoicePdf(invoiceId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/pdf`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const maybeJson = await response
      .json()
      .catch(() => ({ message: `Request failed with ${response.status}` }));
    throw new ApiError(
      response.status,
      maybeJson.message ?? `Request failed with ${response.status}`,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
