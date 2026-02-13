import { apiRequest } from './lib-api';
import type { InvoiceListResponse } from './types';

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
