import { floorToPrecision, TablePrecision } from '../../engine/Money';
import { CrapsNumber, numberBetUnit } from '../../engine/NumberBets';

export type NumberBetAllocation = {
  allocations: Partial<Record<CrapsNumber, number>>;
  allocatedTotal: number;
  minimumCompleteTotal: number;
  remainder: number;
  skippedNumbers: CrapsNumber[];
};

const CLEAN_ALLOCATION_GROUPS: readonly (readonly CrapsNumber[])[] = [
  [6, 8],
  [5, 9],
  [4, 10],
];

export function allocateNumberBetTotal(
  totalInvestment: number,
  selectedNumbers: CrapsNumber[],
  useCleanUnits: boolean,
  precision: TablePrecision
): NumberBetAllocation {
  if (selectedNumbers.length === 0 || totalInvestment <= 0) {
    return emptyAllocation(totalInvestment);
  }

  return useCleanUnits
    ? allocateInCleanUnits(totalInvestment, selectedNumbers)
    : allocateEvenly(totalInvestment, selectedNumbers, precision);
}

function allocateEvenly(
  totalInvestment: number,
  selectedNumbers: CrapsNumber[],
  precision: TablePrecision
): NumberBetAllocation {
  const precisionMultiplier = precision === TablePrecision.DOLLAR ? 1 : 100;
  const availableUnits = Math.floor(Number((totalInvestment * precisionMultiplier).toPrecision(15)));
  const baseUnits = Math.floor(availableUnits / selectedNumbers.length);
  const extraUnits = availableUnits % selectedNumbers.length;
  const allocations: Partial<Record<CrapsNumber, number>> = {};

  selectedNumbers.forEach((number, index) => {
    const units = baseUnits + (index < extraUnits ? 1 : 0);
    if (units > 0) allocations[number] = units / precisionMultiplier;
  });

  return summarizeAllocation(totalInvestment, selectedNumbers, allocations, 0);
}

function allocateInCleanUnits(
  totalInvestment: number,
  selectedNumbers: CrapsNumber[]
): NumberBetAllocation {
  const minimumCompleteTotal = selectedNumbers.reduce((sum, number) => sum + numberBetUnit(number), 0);
  let remainder = totalInvestment;
  const allocations: Partial<Record<CrapsNumber, number>> = {};
  const coveredGroups: CrapsNumber[][] = [];
  const selectedGroups = CLEAN_ALLOCATION_GROUPS
    .map(group => group.filter(number => selectedNumbers.includes(number)))
    .filter(group => group.length > 0);

  for (const group of selectedGroups) {
    const groupCost = group.reduce((sum, number) => sum + numberBetUnit(number), 0);
    if (remainder < groupCost) continue;

    for (const number of group) allocations[number] = numberBetUnit(number);
    remainder -= groupCost;
    coveredGroups.push(group);
  }

  let allocatedAnotherLayer = true;
  while (allocatedAnotherLayer) {
    allocatedAnotherLayer = false;

    for (const group of coveredGroups) {
      const groupCost = group.reduce((sum, number) => sum + numberBetUnit(number), 0);
      if (remainder < groupCost) continue;

      for (const number of group) {
        allocations[number] = (allocations[number] ?? 0) + numberBetUnit(number);
      }
      remainder -= groupCost;
      allocatedAnotherLayer = true;
    }
  }

  return summarizeAllocation(totalInvestment, selectedNumbers, allocations, minimumCompleteTotal);
}

function summarizeAllocation(
  totalInvestment: number,
  selectedNumbers: CrapsNumber[],
  allocations: Partial<Record<CrapsNumber, number>>,
  minimumCompleteTotal: number
): NumberBetAllocation {
  const allocatedTotal = floorToPrecision(
    selectedNumbers.reduce((sum, number) => sum + (allocations[number] ?? 0), 0),
    TablePrecision.CENT
  );

  return {
    allocations,
    allocatedTotal,
    minimumCompleteTotal,
    remainder: floorToPrecision(totalInvestment - allocatedTotal, TablePrecision.CENT),
    skippedNumbers: selectedNumbers.filter(number => allocations[number] === undefined),
  };
}

function emptyAllocation(totalInvestment: number): NumberBetAllocation {
  return {
    allocations: {},
    allocatedTotal: 0,
    minimumCompleteTotal: 0,
    remainder: Math.max(0, totalInvestment),
    skippedNumbers: [],
  };
}
