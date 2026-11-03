import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateLine, type EditorItemState } from './editor-state';

// Druhý řádek položky: množství, jednotka, cena, DPH, celkem, odebrat.
const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,1fr)] gap-2 sm:grid-cols-[88px_80px_minmax(0,1fr)_96px_minmax(0,1fr)_36px] sm:items-center';

export function ItemsSection({
  items,
  readOnly,
  vatCharged,
  onChange,
  onAdd,
  onRemove,
}: {
  items: EditorItemState[];
  readOnly: boolean;
  vatCharged: boolean;
  onChange: (index: number, patch: Partial<EditorItemState>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Položky</CardTitle>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus />
            Přidat položku
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className={`hidden text-xs font-medium text-muted-foreground sm:grid ${GRID}`} aria-hidden="true">
          <span className="text-right">Množství</span>
          <span>Jednotka</span>
          <span className="text-right">Cena/j.</span>
          <span>DPH</span>
          <span className="text-right">Celkem</span>
          <span />
        </div>

        {items.map((item, index) => {
          const line = calculateLine(item, vatCharged);
          const n = index + 1;
          return (
            <div key={index} className={`flex flex-col gap-2 ${index > 0 ? 'border-t pt-3' : ''}`}>
              <Input
                aria-label={`Popis položky ${n}`}
                placeholder={`Popis položky ${n}`}
                disabled={readOnly}
                value={item.description}
                onChange={(event) => onChange(index, { description: event.target.value })}
              />
              <div className={GRID}>
              <Input
                aria-label={`Množství položky ${n}`}
                inputMode="decimal"
                disabled={readOnly}
                value={item.quantity}
                onChange={(event) => onChange(index, { quantity: event.target.value })}
                className="text-right tabular-nums"
              />
              <Input
                aria-label={`Jednotka položky ${n}`}
                disabled={readOnly}
                value={item.unit}
                onChange={(event) => onChange(index, { unit: event.target.value })}
              />
              <Input
                aria-label={`Cena za jednotku položky ${n}`}
                inputMode="decimal"
                disabled={readOnly}
                value={item.unitPrice}
                onChange={(event) => onChange(index, { unitPrice: event.target.value })}
                className="text-right tabular-nums"
              />
              {vatCharged ? (
                <Select
                  disabled={readOnly}
                  value={String(item.vatRate)}
                  onValueChange={(value) => onChange(index, { vatRate: Number(value) })}
                >
                  <SelectTrigger aria-label={`Sazba DPH položky ${n}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent data-ui>
                    <SelectItem value="21">21 %</SelectItem>
                    <SelectItem value="12">12 %</SelectItem>
                    <SelectItem value="0">0 %</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="flex items-center text-sm text-muted-foreground">bez DPH</span>
              )}
              <span className="flex items-center justify-end text-sm font-medium tabular-nums">
                {formatMoney(line.withVat)}
              </span>
              <div className="flex justify-end">
                {!readOnly && items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Odebrat položku ${n}`}
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
