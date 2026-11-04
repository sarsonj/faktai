import { invoicePayment, toCzIban } from './payment-qr';

describe('payment QR', () => {
  it('converts a Czech account to IBAN (ČNB example)', () => {
    expect(toCzIban('19', '2000145399', '0800')).toBe(
      'CZ6508000000192000145399',
    );
  });

  it('builds payment details with the Czech account format', () => {
    const payment = invoicePayment(
      {
        bankAccountPrefix: '19',
        bankAccountNumber: '2000145399',
        bankCode: '0800',
      },
      '1210.50',
      '2026000007',
    );
    expect(payment.bankAccount).toBe('19-2000145399/0800');
    expect(payment.spdPayload).toBe(
      'SPD*1.0*ACC:CZ6508000000192000145399*AM:1210.50*CC:CZK*X-VS:2026000007',
    );
  });
});
