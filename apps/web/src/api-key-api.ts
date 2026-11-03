import { apiRequest } from './lib-api';

export type ApiKeyStatus = {
  exists: boolean;
  prefix: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

export function getApiKeyStatus(): Promise<ApiKeyStatus> {
  return apiRequest<ApiKeyStatus>('/api-key');
}

export function regenerateApiKey(): Promise<ApiKeyStatus & { key: string }> {
  return apiRequest<ApiKeyStatus & { key: string }>('/api-key', { method: 'POST' });
}

export function revokeApiKey(): Promise<void> {
  return apiRequest<void>('/api-key', { method: 'DELETE' });
}
