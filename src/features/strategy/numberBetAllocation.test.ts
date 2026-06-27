import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';
import { floorToPrecision, TablePrecision } from '../../engine/Money';
import { CRAPS_NUMBERS, CrapsNumber, numberBetUnit } from '../../engine/NumberBets';
import { allocateNumberBetTotal } from './numberBetAllocation';

test.prop([
  fc.integer({ min: 1, max: 1_000_000 }).map(cents => cents / 100),
  fc.subarray([...CRAPS_NUMBERS], { minLength: 1 }),
  fc.boolean(),
  fc.constantFrom(TablePrecision.DOLLAR, TablePrecision.CENT),
])('number-bet allocation accounts for the requested amount without overspending', (total, numbers, cleanUnits, precision) => {
  const allocation = allocateNumberBetTotal(total, numbers, cleanUnits, precision);
  const configuredTotal = numbers.reduce((sum, number) => sum + (allocation.allocations[number] ?? 0), 0);
  const spendableTotal = floorToPrecision(total, TablePrecision.CENT);

  expect(configuredTotal).toBeCloseTo(allocation.allocatedTotal, 2);
  expect(allocation.allocatedTotal).toBeLessThanOrEqual(spendableTotal);
  expect(allocation.remainder).toBeGreaterThanOrEqual(0);
  expect(allocation.remainder).toBeCloseTo(spendableTotal - allocation.allocatedTotal, 2);
  expect(allocation.skippedNumbers).toEqual(numbers.filter(number => allocation.allocations[number] === undefined));

  for (const [number, amount] of Object.entries(allocation.allocations)) {
    expect(amount).toBeGreaterThan(0);

    if (cleanUnits) {
      expect(amount % numberBetUnit(Number(number) as CrapsNumber)).toBe(0);
    } else {
      expect(isWholePrecisionAmount(amount, precision)).toBe(true);
    }
  }
});

function isWholePrecisionAmount(amount: number, precision: TablePrecision): boolean {
  const multiplier = precision === TablePrecision.DOLLAR ? 1 : 100;
  return Number.isInteger(Number((amount * multiplier).toPrecision(15)));
}
