// Sdílené formátování pro UI (částky, stavy dokladů).

export function formatMoney(value: string | number): string {
  const number = typeof value === 'number' ? value : Number(value);
  return `${(Number.isFinite(number) ? number : 0).toLocaleString('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Kč`;
}
