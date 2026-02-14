import { apiRequest } from './lib-api';
import type { SubjectInput, SubjectProfile, TaxOfficeOption } from './types';

export async function getSubject(): Promise<SubjectProfile> {
  return apiRequest<SubjectProfile>('/subject');
}

export async function createSubject(payload: SubjectInput): Promise<SubjectProfile> {
  return apiRequest<SubjectProfile>('/subject', { method: 'POST', body: payload });
}

export async function updateSubject(payload: Partial<SubjectInput>): Promise<SubjectProfile> {
  return apiRequest<SubjectProfile>('/subject', { method: 'PATCH', body: payload });
}

export async function getTaxOffices(): Promise<TaxOfficeOption[]> {
  return apiRequest<TaxOfficeOption[]>('/subject/tax-offices');
}
