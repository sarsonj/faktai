import { API_BASE_URL, ApiError, apiRequest } from './lib-api';
import type {
  ReceivedDocument,
  ReceivedDocumentAttachment,
  ReceivedDocumentInput,
  ReceivedDocumentListResponse,
} from './types';

export function listReceivedDocuments(query: { year: number; q: string; page: number; pageSize: number }) {
  const search = new URLSearchParams({
    year: String(query.year),
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q) search.set('q', query.q);
  return apiRequest<ReceivedDocumentListResponse>(`/received-documents?${search.toString()}`);
}

export function getReceivedDocument(id: string) {
  return apiRequest<ReceivedDocument>(`/received-documents/${id}`);
}

export function createReceivedDocument(payload: ReceivedDocumentInput) {
  return apiRequest<ReceivedDocument>('/received-documents', { method: 'POST', body: payload });
}

export function updateReceivedDocument(id: string, payload: ReceivedDocumentInput) {
  return apiRequest<ReceivedDocument>(`/received-documents/${id}`, { method: 'PATCH', body: payload });
}

export function deleteReceivedDocument(id: string) {
  return apiRequest<void>(`/received-documents/${id}`, { method: 'DELETE' });
}

async function errorFrom(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
  return new ApiError(response.status, message ?? `Požadavek selhal (${response.status})`);
}

export async function uploadReceivedAttachment(id: string, file: File): Promise<ReceivedDocumentAttachment> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE_URL}/received-documents/${id}/attachments`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as ReceivedDocumentAttachment;
}

/** Otevře přílohu v nové záložce (přes blob, aby fungovalo i s cookie session). */
export async function openReceivedAttachment(id: string, attachment: ReceivedDocumentAttachment): Promise<void> {
  const target = window.open('', '_blank');
  const response = await fetch(`${API_BASE_URL}/received-documents/${id}/attachments/${attachment.id}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    target?.close();
    throw await errorFrom(response);
  }
  const url = URL.createObjectURL(await response.blob());
  if (target) {
    target.location.href = url;
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.fileName;
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function deleteReceivedAttachment(id: string, attachmentId: string) {
  return apiRequest<void>(`/received-documents/${id}/attachments/${attachmentId}`, { method: 'DELETE' });
}
