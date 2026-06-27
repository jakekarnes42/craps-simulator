import { CrapsNumber } from '../../engine/NumberBets';

export type StrategyZone =
  | 'PASS'
  | 'DONT_PASS'
  | 'COME'
  | 'DONT_COME'
  | 'NUMBER_4'
  | 'NUMBER_5'
  | 'NUMBER_6'
  | 'NUMBER_8'
  | 'NUMBER_9'
  | 'NUMBER_10';

export type NumberStrategyZone = Extract<StrategyZone, `NUMBER_${string}`>;
export type StrategyMacro = 'ACROSS' | 'INSIDE';
export type StrategyEditor = Exclude<StrategyZone, NumberStrategyZone> | 'NUMBERS';

export const NUMBER_STRATEGY_ZONES = [
  'NUMBER_4',
  'NUMBER_5',
  'NUMBER_6',
  'NUMBER_8',
  'NUMBER_9',
  'NUMBER_10',
] as const satisfies readonly NumberStrategyZone[];

export const NUMBER_ZONE_TO_NUMBER: Record<NumberStrategyZone, CrapsNumber> = {
  NUMBER_4: 4,
  NUMBER_5: 5,
  NUMBER_6: 6,
  NUMBER_8: 8,
  NUMBER_9: 9,
  NUMBER_10: 10,
};

export const NUMBER_TO_ZONE: Record<CrapsNumber, NumberStrategyZone> = {
  4: 'NUMBER_4',
  5: 'NUMBER_5',
  6: 'NUMBER_6',
  8: 'NUMBER_8',
  9: 'NUMBER_9',
  10: 'NUMBER_10',
};

export const STRATEGY_MACRO_NUMBERS: Record<StrategyMacro, CrapsNumber[]> = {
  ACROSS: [4, 5, 6, 8, 9, 10],
  INSIDE: [5, 6, 8, 9],
};

export function isNumberStrategyZone(zone: StrategyZone): zone is NumberStrategyZone {
  return (NUMBER_STRATEGY_ZONES as readonly StrategyZone[]).includes(zone);
}

export function numberForZone(zone: StrategyZone): CrapsNumber | undefined {
  return isNumberStrategyZone(zone) ? NUMBER_ZONE_TO_NUMBER[zone] : undefined;
}

export function zoneForNumber(number: CrapsNumber): NumberStrategyZone {
  return NUMBER_TO_ZONE[number];
}
