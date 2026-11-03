import { createContext, useContext } from 'react';
import type { MeResponse } from '../types';

export type AuthContextValue = {
  me: MeResponse | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<MeResponse>;
  register: (email: string, password: string, passwordConfirm: string) => Promise<MeResponse>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
