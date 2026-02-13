export function isValidIco(ico: string): boolean {
  if (!/^\d{8}$/.test(ico)) {
    return false;
  }

  const digits = ico.split('').map(Number);
  const sum =
    digits[0] * 8 +
    digits[1] * 7 +
    digits[2] * 6 +
    digits[3] * 5 +
    digits[4] * 4 +
    digits[5] * 3 +
    digits[6] * 2;

  const mod = sum % 11;
  let check = 11 - mod;

  if (check === 10) {
    check = 0;
  } else if (check === 11) {
    check = 1;
  }

  return check === digits[7];
}
