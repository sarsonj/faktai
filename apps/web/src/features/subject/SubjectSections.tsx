import { useEffect, useState } from 'react';
import { findBankByCode, normalizeBankCode } from '../../bank-codes';
import { searchRegistryAddresses, searchRegistryCompanies } from '../../registry-api';
import { getTaxOffices } from '../../subject-api';
import type { RegistryAddressResult, RegistryCompanyResult, TaxOfficeOption } from '../../types';
import { Field } from '../../components/app/Field';
import { RegistryLookup } from '../../components/app/RegistryLookup';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SubjectFormState, SubjectPatch } from './subject-form-state';

// Sekce formuláře subjektu – skládá je nastavení (vše najednou) i onboarding (po krocích).

type SectionProps = { state: SubjectFormState; patch: SubjectPatch; disabled?: boolean };

export function CompanyLookup({ state, patch }: SectionProps) {
  return (
    <RegistryLookup<RegistryCompanyResult>
      label="Načíst údaje z ARES"
      placeholder="Najít v ARES podle IČO nebo názvu"
      emptyMessage="Firmu jsme v registru nenašli. Můžete pokračovat ručně."
      fallbackQuery={state.ico}
      search={searchRegistryCompanies}
      resultKey={(item) => `${item.ico}-${item.name}`}
      renderResult={(item) => (
        <>
          <span className="block truncate font-medium">{item.name}</span>
          <span className="block truncate text-muted-foreground">
            IČO {item.ico}
            {item.city ? ` · ${item.city}` : ''}
          </span>
        </>
      )}
      onSelect={(item) =>
        patch({
          businessName: item.name || state.businessName,
          ico: item.ico || state.ico,
          dic: item.dic ?? state.dic,
          street: item.street || state.street,
          city: item.city || state.city,
          postalCode: item.postalCode || state.postalCode,
          countryCode: item.countryCode || state.countryCode,
        })
      }
    />
  );
}

export function IdentityFields({ state, patch, disabled }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id="first-name" label="Jméno">
        <Input id="first-name" required disabled={disabled} value={state.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
      </Field>
      <Field id="last-name" label="Příjmení">
        <Input id="last-name" required disabled={disabled} value={state.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
      </Field>
      <Field id="business-name" label="Obchodní název" hint="Nepovinné – zobrazí se na faktuře místo jména." className="sm:col-span-2">
        <Input id="business-name" disabled={disabled} value={state.businessName} onChange={(e) => patch({ businessName: e.target.value })} />
      </Field>
      <Field id="ico" label="IČO">
        <Input
          id="ico"
          required
          inputMode="numeric"
          disabled={disabled}
          value={state.ico}
          onChange={(e) => patch({ ico: e.target.value.replace(/\s+/g, '') })}
        />
      </Field>
      <Field id="dic" label="DIČ" hint={state.isVatPayer ? 'Povinné pro plátce DPH.' : 'Nepovinné.'}>
        <Input id="dic" disabled={disabled} value={state.dic} onChange={(e) => patch({ dic: e.target.value })} />
      </Field>
    </div>
  );
}

export function AddressFields({ state, patch, disabled, withLookup = false }: SectionProps & { withLookup?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {withLookup && (
        <RegistryLookup<RegistryAddressResult>
          label="Vyhledat adresu"
          placeholder="Vyhledat adresu (ulice, číslo, město)"
          minLength={3}
          emptyMessage="Adresu jsme nenašli. Pokračujte ručně."
          fallbackQuery={[state.street, state.city].filter(Boolean).join(' ')}
          search={searchRegistryAddresses}
          resultKey={(item) => item.id}
          renderResult={(item) => (
            <span className="block truncate">
              {[item.street, item.city, item.postalCode].filter(Boolean).join(', ') || item.displayName}
            </span>
          )}
          onSelect={(item) =>
            patch({
              street: item.street || state.street,
              city: item.city || state.city,
              postalCode: item.postalCode || state.postalCode,
              countryCode: item.countryCode || state.countryCode,
            })
          }
        />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Field id="street" label="Ulice a číslo" className="sm:col-span-6">
          <Input id="street" required disabled={disabled} value={state.street} onChange={(e) => patch({ street: e.target.value })} />
        </Field>
        <Field id="city" label="Město" className="sm:col-span-3">
          <Input id="city" required disabled={disabled} value={state.city} onChange={(e) => patch({ city: e.target.value })} />
        </Field>
        <Field id="postal-code" label="PSČ" className="sm:col-span-2">
          <Input
            id="postal-code"
            required
            inputMode="numeric"
            disabled={disabled}
            value={state.postalCode}
            onChange={(e) => patch({ postalCode: e.target.value.replace(/\s+/g, '') })}
          />
        </Field>
        <Field id="country" label="Země" className="sm:col-span-1">
          <Input
            id="country"
            required
            maxLength={2}
            disabled={disabled}
            value={state.countryCode}
            onChange={(e) => patch({ countryCode: e.target.value.replace(/\s+/g, '').toUpperCase() })}
          />
        </Field>
      </div>
    </div>
  );
}

export function VatFields({ state, patch, disabled }: SectionProps) {
  const [offices, setOffices] = useState<TaxOfficeOption[]>([]);
  const [officesError, setOfficesError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getTaxOffices()
      .then((items) => {
        if (!ignore) setOffices(items);
      })
      .catch((err: unknown) => {
        if (!ignore) setOfficesError(err instanceof Error ? err.message : 'Načtení číselníku finančních úřadů selhalo.');
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="vat-payer"
          disabled={disabled}
          checked={state.isVatPayer}
          onCheckedChange={(checked) => patch({ isVatPayer: checked === true })}
        />
        <Label htmlFor="vat-payer" className="font-normal">
          Jsem plátce DPH
        </Label>
      </div>

      {state.isVatPayer && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="vat-registration" label="Datum registrace k DPH">
            <Input
              id="vat-registration"
              type="date"
              disabled={disabled}
              value={state.vatRegistrationDate}
              onChange={(e) => patch({ vatRegistrationDate: e.target.value })}
            />
          </Field>
          <Field id="vat-period" label="Zdaňovací období">
            <Select
              disabled={disabled}
              value={state.vatPeriodType}
              onValueChange={(value) => patch({ vatPeriodType: value as 'month' | 'quarter' })}
            >
              <SelectTrigger id="vat-period" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Měsíční</SelectItem>
                <SelectItem value="quarter">Čtvrtletní</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="tax-office"
            label="Místní příslušnost finančního úřadu"
            hint={officesError ?? undefined}
            className="sm:col-span-2"
          >
            <Select
              disabled={disabled}
              value={state.taxOfficePracufo}
              onValueChange={(value) => patch({ taxOfficePracufo: value })}
            >
              <SelectTrigger id="tax-office" className="w-full">
                <SelectValue placeholder="Vyberte územní pracoviště" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {offices.map((office) => (
                  <SelectItem key={office.pracufo} value={office.pracufo}>
                    {office.name} ({office.pracufo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="contact-phone" label="Telefon pro finanční úřad" hint="Nepovinné, uvádí se v podáních DPH.">
          <Input
            id="contact-phone"
            type="tel"
            placeholder="+420 777 123 456"
            disabled={disabled}
            value={state.contactPhone}
            onChange={(e) => patch({ contactPhone: e.target.value })}
          />
        </Field>
        <Field id="contact-email" label="E-mail pro finanční úřad" hint="Nepovinné.">
          <Input
            id="contact-email"
            type="email"
            placeholder="kontakt@example.cz"
            disabled={disabled}
            value={state.contactEmail}
            onChange={(e) => patch({ contactEmail: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

export function PaymentFields({ state, patch, disabled }: SectionProps) {
  const bank = findBankByCode(state.bankCode);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      <Field id="account-prefix" label="Předčíslí" className="sm:col-span-1">
        <Input
          id="account-prefix"
          inputMode="numeric"
          disabled={disabled}
          value={state.bankAccountPrefix}
          onChange={(e) => patch({ bankAccountPrefix: e.target.value })}
        />
      </Field>
      <Field id="account-number" label="Číslo účtu" className="sm:col-span-3">
        <Input
          id="account-number"
          required
          inputMode="numeric"
          disabled={disabled}
          value={state.bankAccountNumber}
          onChange={(e) => patch({ bankAccountNumber: e.target.value })}
        />
      </Field>
      <Field id="bank-code" label="Kód banky" hint={bank?.name ?? 'Čtyřmístný kód podle ČNB.'} className="sm:col-span-2">
        <Input
          id="bank-code"
          required
          inputMode="numeric"
          maxLength={4}
          disabled={disabled}
          value={state.bankCode}
          onChange={(e) => patch({ bankCode: normalizeBankCode(e.target.value) })}
        />
      </Field>
      <Field id="due-days" label="Výchozí splatnost faktur (dny)" className="sm:col-span-3">
        <Input
          id="due-days"
          type="number"
          min={1}
          max={90}
          required
          disabled={disabled}
          value={state.defaultDueDays}
          onChange={(e) => patch({ defaultDueDays: e.target.value })}
        />
      </Field>
    </div>
  );
}
