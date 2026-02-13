import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib-api';
import type { MeResponse } from '../types';

type AuthContextValue = {
  me: MeResponse | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<MeResponse>;
  register: (email: string, password: string, passwordConfirm: string) => Promise<MeResponse>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const profile = await apiRequest<MeResponse>('/auth/me');
      setMe(profile);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      me,
      loading,
      refreshMe,
      login: async (email, password) => {
        const profile = await apiRequest<MeResponse>('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        setMe(profile);
        return profile;
      },
      register: async (email, password, passwordConfirm) => {
        const profile = await apiRequest<MeResponse>('/auth/register', {
          method: 'POST',
          body: { email, password, passwordConfirm },
        });
        setMe(profile);
        return profile;
      },
      logout: async () => {
        await apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' });
        setMe(null);
      },
    }),
    [me, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
