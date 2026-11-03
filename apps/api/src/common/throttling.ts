import type { ThrottlerModuleOptions } from '@nestjs/throttler';

// Pozor: @nestjs/throttler aplikuje KAŽDÝ pojmenovaný throttler na KAŽDOU route.
// Proto existuje jen jeden globální throttler a přísnější limity pro auth
// endpointy se nastavují přes @Throttle({ default: ... }) přímo na route.
export const THROTTLER_OPTIONS: ThrottlerModuleOptions = [
  { name: 'default', ttl: 60_000, limit: 150 },
];
