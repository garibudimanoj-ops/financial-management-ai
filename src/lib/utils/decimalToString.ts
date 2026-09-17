import { Prisma } from '@prisma/client';

export function decimalToString(val: Prisma.Decimal | null | undefined): string {
  if (val === null || val === undefined) return '0.00';
  return val.toFixed(2);
}

export function decimalToNumber(val: Prisma.Decimal | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}