import { apiRequest } from './lib-api';
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
