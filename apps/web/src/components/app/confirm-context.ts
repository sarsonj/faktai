import { createContext, useContext } from 'react';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destruktivní akce (smazání, zrušení) – červené tlačítko. */
  destructive?: boolean;
};

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Potvrzovací dialog místo `window.confirm`: `if (!(await confirm({...}))) return;` */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return confirm;
}
