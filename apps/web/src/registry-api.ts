import { apiRequest } from './lib-api';
import type { RegistryAddressResult, RegistryCompanyResult } from './types';

export async function searchRegistryCompanies(query: string): Promise<RegistryCompanyResult[]> {
  const search = new URLSearchParams({ q: query });
  const response = await apiRequest<{ items: RegistryCompanyResult[] }>(
    `/registry/company-search?${search.toString()}`,
  );
  return response.items;
}

export async function searchRegistryAddresses(query: string): Promise<RegistryAddressResult[]> {
  const search = new URLSearchParams({ q: query });
  const response = await apiRequest<{ items: RegistryAddressResult[] }>(
    `/registry/address-search?${search.toString()}`,
  );
  return response.items;
}
