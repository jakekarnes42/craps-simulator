import { expect } from 'vitest';
import { Configuration } from '../Configuration';
import { GameState, LimitReached, sumBetCollection } from '../GameState';
import { CRAPS_NUMBERS, CrapsNumber } from '../NumberBets';
import { TablePrecision } from '../Money';
import { OddsBetStrategy, OddsBetStrategyType, PressStrategyType } from '../Strategies';
import { BetOutcome, BetType, executeRoll, RollResult } from '../Session';
import { StateMachineScenario } from './stateMachineScenarios';

type OutcomeCounts = Record<BetOutcome, number>;

type LedgerStats = {
  cumulativeWinnings: number;
  cumulativeLosses: number;
};

export type ScenarioRun = {
  scenario: StateMachineScenario;
  results: RollResult[];
  coverage: Set<string>;
};

const crapsNumbers = [...CRAPS_NUMBERS];
const oddsBetTypes = new Set<BetType>([
  BetType.PASSLINE_ODDS,
  BetType.DONTPASS_ODDS,
  BetType.COME_ODDS,
  BetType.DONTCOME_ODDS,
]);

const requiredCoverageTags = [
  'phase:come-out',
  'phase:point-on',
  'transition:point-established',
  'transition:point-cleared',
  `new:${BetType.PASSLINE}`,
  `new:${BetType.DONTPASS}`,
  `new:${BetType.COME}`,
  `new:${BetType.DONTCOME}`,
  `new:${BetType.PASSLINE_ODDS}`,
  `new:${BetType.DONTPASS_ODDS}`,
  `new:${BetType.COME_ODDS}`,
  `new:${BetType.DONTCOME_ODDS}`,
  `new:${BetType.NUMBER_BET}`,
  `resolved:${BetType.PASSLINE}:${BetOutcome.WIN}`,
  `resolved:${BetType.PASSLINE}:${BetOutcome.LOSS}`,
  `resolved:${BetType.DONTPASS}:${BetOutcome.WIN}`,
  `resolved:${BetType.DONTPASS}:${BetOutcome.LOSS}`,
  `resolved:${BetType.DONTPASS}:${BetOutcome.PUSH}`,
  `resolved:${BetType.COME}:${BetOutcome.WIN}`,
  `resolved:${BetType.COME}:${BetOutcome.LOSS}`,
  `resolved:${BetType.DONTCOME}:${BetOutcome.WIN}`,
  `resolved:${BetType.DONTCOME}:${BetOutcome.LOSS}`,
  `resolved:${BetType.DONTCOME}:${BetOutcome.PUSH}`,
  `resolved:odds:${BetOutcome.WIN}`,
  `resolved:odds:${BetOutcome.LOSS}`,
  `resolved:odds:${BetOutcome.PUSH}`,
  `resolved:number:${BetOutcome.WIN}`,
  `resolved:number:${BetOutcome.LOSS}`,
  'number:come-out-working',
  'number:come-out-off',
  'number:pressed',
  'number:press-limit-cashout',
  `limit:${LimitReached.BANKROLL_MIN}`,
  `limit:${LimitReached.BANKROLL_MAX}`,
  `limit:${LimitReached.BUSTED}`,
  `limit:${LimitReached.MAX_ROLLS}`,
  'limit:no-new-bets',
];

export function runScenario(scenario: StateMachineScenario): ScenarioRun {
  const results: RollResult[] = [];
  const coverage = new Set<string>();
  const ledger: LedgerStats = { cumulativeWinnings: 0, cumulativeLosses: 0 };
  let state = GameState.init(scenario.config);

  for (const roll of scenario.rolls) {
    if (state.isDone()) break;

    const result = executeRoll(state, roll);
    assertRollInvariants(scenario.config, state, result, roll, ledger);
    recordCoverage(coverage, state, result);
    results.push(result);
    state = result.resultingState;
  }

  return { scenario, results, coverage };
}

export function assertRequiredStateMachineCoverage(coverage: Set<string>) {
  const missing = requiredCoverageTags.filter(tag => !coverage.has(tag));
  expect(missing, `missing state-machine coverage: ${missing.join(', ')}`).toEqual([]);
}

export function mergeCoverage(runs: ScenarioRun[]): Set<string> {
  return new Set(runs.flatMap(run => [...run.coverage]));
}

export function assertGeneratedRolls(config: Configuration, rolls: number[]) {
  const ledger: LedgerStats = { cumulativeWinnings: 0, cumulativeLosses: 0 };
  let state = GameState.init(config);

  for (const roll of rolls) {
    if (state.isDone()) break;

    const result = executeRoll(state, roll);
    assertRollInvariants(config, state, result, roll, ledger);
    state = result.resultingState;
  }
}

export function outcomeCountsFor(result: RollResult, type: BetType): OutcomeCounts {
  const counts = emptyOutcomeCounts();
  for (const resolvedBet of result.resolvedBets) {
    if (resolvedBet.placedBet.type === type) {
      counts[resolvedBet.outcome] += 1;
    }
  }
  return counts;
}

function assertRollInvariants(
  config: Configuration,
  previousState: GameState,
  result: RollResult,
  expectedRoll: number,
  ledger: LedgerStats
) {
  const nextState = result.resultingState;

  expect(result.initialState).toBe(previousState);
  expect(result.roll).toBe(expectedRoll);
  expect(nextState.rollNum).toBe(previousState.rollNum + 1);

  addRollToLedger(result, ledger);

  assertNoNewBetsAfterLimit(previousState, result);
  assertPlacementAccounting(previousState, result);
  assertWealthConservation(config, nextState, ledger);
  assertLegalStateShape(config, nextState);
  assertOddsAmounts(config, nextState);
  assertNumberBetProgression(config, result);
  assertResolvedBetRules(config, result);
  assertPayoutRules(config, previousState, result);
  assertPointTransition(previousState, nextState, expectedRoll);
  assertTerminalStateWhenNoFutureBetCanBePlaced(config, nextState);
}

function assertNoNewBetsAfterLimit(previousState: GameState, result: RollResult) {
  if (previousState.limitReached() !== null) {
    expect(result.newBets).toHaveLength(0);
  }
}

function assertPlacementAccounting(previousState: GameState, result: RollResult) {
  const newlyPlaced = result.newBets.reduce((total, bet) => total + bet.bet, 0);

  expect(result.placedBetState.bankroll).toBeCloseTo(previousState.bankroll - newlyPlaced, 2);
}

function assertWealthConservation(config: Configuration, nextState: GameState, ledger: LedgerStats) {
  const currentWealth = nextState.bankroll + sumBetCollection(nextState.currentBets);
  const expectedWealth = config.initialBankroll! + ledger.cumulativeWinnings - ledger.cumulativeLosses;

  expect(nextState.bankroll).toBeGreaterThanOrEqual(0);
  expect(currentWealth).toBeCloseTo(expectedWealth, 2);

  if (config.bankrollMinimum !== null && config.bankrollMinimum > 0 && nextState.bankroll <= config.bankrollMinimum) {
    expect(nextState.limitReached()).not.toBeNull();
  }

  if (config.bankrollMaximum !== null && nextState.bankroll >= config.bankrollMaximum) {
    expect([
      LimitReached.BANKROLL_MAX,
      LimitReached.BANKROLL_MIN,
      LimitReached.MAX_ROLLS,
    ]).toContain(nextState.limitReached());
  }

  if (config.maximumRolls !== null && nextState.rollNum >= config.maximumRolls) {
    expect([
      LimitReached.MAX_ROLLS,
      LimitReached.BANKROLL_MAX,
      LimitReached.BANKROLL_MIN,
    ]).toContain(nextState.limitReached());
  }
}

function assertLegalStateShape(config: Configuration, state: GameState) {
  if (state.pointIsOn) {
    expect(crapsNumbers).toContain(state.point);
  } else {
    expect(state.point).toBe(0);
  }

  const { passLineBet, dontPassBet, comeBets, dontComeBets, numberBets } = state.currentBets;
  assertPositiveBet(passLineBet);
  assertPositiveBet(dontPassBet);

  expect(comeBets.length).toBeLessThanOrEqual(config.maxComeBets);
  expect(dontComeBets.length).toBeLessThanOrEqual(config.maxDontComeBets);

  expect(uniqueAssignedPoints(comeBets)).toBe(true);
  expect(uniqueAssignedPoints(dontComeBets)).toBe(true);

  for (const bet of [...comeBets, ...dontComeBets]) {
    assertPositiveBet(bet);
    if (bet.comePoint !== null) expect(crapsNumbers).toContain(bet.comePoint);
  }

  const activeNumbers = numberBets.map(bet => bet.number);
  expect(new Set(activeNumbers).size).toBe(activeNumbers.length);
  if (config.omitNumberBetOnPoint && state.pointIsOn) {
    expect(activeNumbers).not.toContain(state.point);
  }

  for (const numberBet of numberBets) {
    expect(crapsNumbers).toContain(numberBet.number);
    expect(numberBet.bet).toBeGreaterThan(0);
    expect(numberBet.winCount).toBeGreaterThanOrEqual(0);
    expect(state.cashedOutNumbers).not.toContain(numberBet.number);

    if (config.avoidRounding) {
      expect(numberBet.bet % cleanNumberBetUnit(numberBet.number)).toBe(0);
    }

    if (config.getPressStrategy(numberBet.number).type === PressStrategyType.NO_PRESS) {
      expect(numberBet.bet).toBe(config.effectiveNumberBet(numberBet.number));
    }
  }
}

function assertPositiveBet(bet: { bet: number; odds: number | null } | null) {
  if (!bet) return;
  expect(bet.bet).toBeGreaterThan(0);
  if (bet.odds !== null) expect(bet.odds).toBeGreaterThan(0);
}

function uniqueAssignedPoints(bets: Array<{ comePoint: number | null }>): boolean {
  const assignedPoints = bets.map(bet => bet.comePoint).filter((point): point is number => point !== null);
  return new Set(assignedPoints).size === assignedPoints.length;
}

function assertOddsAmounts(config: Configuration, state: GameState) {
  const { passLineBet, dontPassBet, comeBets, dontComeBets } = state.currentBets;
  const { avoidRounding, tablePrecision } = config;

  if (passLineBet?.odds) {
    expect(passLineBet.odds).toBe(expectedOddsAmount(passLineBet.bet, config.passBetOddsStrategy, avoidRounding, tablePrecision, false, state.point));
  }
  if (dontPassBet?.odds) {
    expect(dontPassBet.odds).toBe(expectedOddsAmount(dontPassBet.bet, config.dontPassBetOddsStrategy, avoidRounding, tablePrecision, true, state.point));
  }

  for (const comeBet of comeBets) {
    if (comeBet.odds && comeBet.comePoint !== null) {
      expect(comeBet.odds).toBe(expectedOddsAmount(comeBet.bet, config.comeBetOddsStrategy, avoidRounding, tablePrecision, false, comeBet.comePoint));
    }
  }

  for (const dontComeBet of dontComeBets) {
    if (dontComeBet.odds && dontComeBet.comePoint !== null) {
      expect(dontComeBet.odds).toBe(expectedOddsAmount(dontComeBet.bet, config.dontComeBetOddsStrategy, avoidRounding, tablePrecision, true, dontComeBet.comePoint));
    }
  }

  if (!state.pointIsOn) {
    expect(passLineBet?.odds).toBeFalsy();
    expect(dontPassBet?.odds).toBeFalsy();
  }
}

function assertNumberBetProgression(config: Configuration, result: RollResult) {
  const placedNumbers = result.placedBetState.currentBets.numberBets;
  const nextNumbers = result.resultingState.currentBets.numberBets;

  for (const resolvedBet of result.resolvedBets) {
    if (resolvedBet.placedBet.type !== BetType.NUMBER_BET || resolvedBet.outcome !== BetOutcome.WIN) continue;

    const number = resolvedBet.placedBet.number!;
    const placedNumberBet = placedNumbers.find(bet => bet.number === number);
    const nextNumberBet = nextNumbers.find(bet => bet.number === number);
    if (!placedNumberBet || !nextNumberBet) continue;

    expect(nextNumberBet.bet).toBeGreaterThanOrEqual(placedNumberBet.bet);
  }

  if (config.pressLimit !== null) {
    nextNumbers.forEach(bet => expect(bet.winCount).toBeLessThan(config.pressLimit!));
  }
}

function assertResolvedBetRules(config: Configuration, result: RollResult) {
  const expectedByType = new Map<BetType, OutcomeCounts>();
  for (const type of Object.values(BetType)) {
    expectedByType.set(type, emptyOutcomeCounts());
  }

  const add = (type: BetType, outcome: BetOutcome) => {
    expectedByType.get(type)![outcome] += 1;
  };

  const placed = result.placedBetState;
  const roll = result.roll;

  addLineBetOutcomes(placed, roll, add);
  addComeBetOutcomes(config, placed, roll, add);
  addNumberBetOutcomes(config, placed, roll, add);

  for (const [type, counts] of expectedByType.entries()) {
    expect(outcomeCountsFor(result, type)).toEqual(counts);
  }
}

function addLineBetOutcomes(
  placed: GameState,
  roll: number,
  add: (type: BetType, outcome: BetOutcome) => void
) {
  const passLineBet = placed.currentBets.passLineBet;
  if (passLineBet) {
    if (placed.pointIsOn) {
      if (roll === placed.point) {
        add(BetType.PASSLINE, BetOutcome.WIN);
        if (passLineBet.odds) add(BetType.PASSLINE_ODDS, BetOutcome.WIN);
      } else if (roll === 7) {
        add(BetType.PASSLINE, BetOutcome.LOSS);
        if (passLineBet.odds) add(BetType.PASSLINE_ODDS, BetOutcome.LOSS);
      }
    } else if (roll === 7 || roll === 11) {
      add(BetType.PASSLINE, BetOutcome.WIN);
    } else if (roll === 2 || roll === 3 || roll === 12) {
      add(BetType.PASSLINE, BetOutcome.LOSS);
    }
  }

  const dontPassBet = placed.currentBets.dontPassBet;
  if (dontPassBet) {
    if (placed.pointIsOn) {
      if (roll === 7) {
        add(BetType.DONTPASS, BetOutcome.WIN);
        if (dontPassBet.odds) add(BetType.DONTPASS_ODDS, BetOutcome.WIN);
      } else if (roll === placed.point) {
        add(BetType.DONTPASS, BetOutcome.LOSS);
        if (dontPassBet.odds) add(BetType.DONTPASS_ODDS, BetOutcome.LOSS);
      }
    } else if (roll === 2 || roll === 3) {
      add(BetType.DONTPASS, BetOutcome.WIN);
    } else if (roll === 7 || roll === 11) {
      add(BetType.DONTPASS, BetOutcome.LOSS);
    } else if (roll === 12) {
      add(BetType.DONTPASS, BetOutcome.PUSH);
    }
  }
}

function addComeBetOutcomes(
  config: Configuration,
  placed: GameState,
  roll: number,
  add: (type: BetType, outcome: BetOutcome) => void
) {
  for (const comeBet of placed.currentBets.comeBets) {
    if (comeBet.comePoint === null) {
      if (roll === 7 || roll === 11) add(BetType.COME, BetOutcome.WIN);
      else if (roll === 2 || roll === 3 || roll === 12) add(BetType.COME, BetOutcome.LOSS);
      continue;
    }

    if (roll === comeBet.comePoint) {
      add(BetType.COME, BetOutcome.WIN);
      if (comeBet.odds) {
        add(BetType.COME_ODDS, placed.pointIsOn || config.comeBetOddsWorkingComeOut ? BetOutcome.WIN : BetOutcome.PUSH);
      }
    } else if (roll === 7) {
      add(BetType.COME, BetOutcome.LOSS);
      if (comeBet.odds) {
        add(BetType.COME_ODDS, placed.pointIsOn || config.comeBetOddsWorkingComeOut ? BetOutcome.LOSS : BetOutcome.PUSH);
      }
    }
  }

  for (const dontComeBet of placed.currentBets.dontComeBets) {
    if (dontComeBet.comePoint === null) {
      if (roll === 2 || roll === 3) add(BetType.DONTCOME, BetOutcome.WIN);
      else if (roll === 7 || roll === 11) add(BetType.DONTCOME, BetOutcome.LOSS);
      else if (roll === 12) add(BetType.DONTCOME, BetOutcome.PUSH);
      continue;
    }

    if (roll === 7) {
      add(BetType.DONTCOME, BetOutcome.WIN);
      if (dontComeBet.odds) {
        add(BetType.DONTCOME_ODDS, placed.pointIsOn || config.dontComeBetOddsWorkingComeOut ? BetOutcome.WIN : BetOutcome.PUSH);
      }
    } else if (roll === dontComeBet.comePoint) {
      add(BetType.DONTCOME, BetOutcome.LOSS);
      if (dontComeBet.odds) {
        add(BetType.DONTCOME_ODDS, placed.pointIsOn || config.dontComeBetOddsWorkingComeOut ? BetOutcome.LOSS : BetOutcome.PUSH);
      }
    }
  }
}

function addNumberBetOutcomes(
  config: Configuration,
  placed: GameState,
  roll: number,
  add: (type: BetType, outcome: BetOutcome) => void
) {
  if (!placed.pointIsOn && !config.leaveNumberBetsWorkingDuringComeOut) return;

  for (const numberBet of placed.currentBets.numberBets) {
    if (roll === 7) add(BetType.NUMBER_BET, BetOutcome.LOSS);
    else if (roll === numberBet.number) add(BetType.NUMBER_BET, BetOutcome.WIN);
  }
}

function assertPayoutRules(config: Configuration, previousState: GameState, result: RollResult) {
  const winningComeOdds = result.placedBetState.currentBets.comeBets
    .filter(comeBet => comeBet.odds !== null && comeBet.comePoint === result.roll && (result.placedBetState.pointIsOn || config.comeBetOddsWorkingComeOut))
    .map(comeBet => ({ odds: comeBet.odds!, point: comeBet.comePoint! }));

  const winningDontComeOdds = result.placedBetState.currentBets.dontComeBets
    .filter(dontComeBet => dontComeBet.odds !== null && dontComeBet.comePoint !== null && result.roll === 7 && (result.placedBetState.pointIsOn || config.dontComeBetOddsWorkingComeOut))
    .map(dontComeBet => ({ odds: dontComeBet.odds!, point: dontComeBet.comePoint! }));

  for (const resolvedBet of result.resolvedBets) {
    if (resolvedBet.outcome !== BetOutcome.WIN) continue;

    switch (resolvedBet.placedBet.type) {
      case BetType.PASSLINE:
      case BetType.DONTPASS:
      case BetType.COME:
      case BetType.DONTCOME:
        expect(resolvedBet.payout).toBe(resolvedBet.placedBet.bet);
        break;
      case BetType.PASSLINE_ODDS:
        assertPassOddsPayout(previousState.point, resolvedBet.placedBet.bet, resolvedBet.payout, config.tablePrecision);
        break;
      case BetType.DONTPASS_ODDS:
        assertDontOddsPayout(previousState.point, resolvedBet.placedBet.bet, resolvedBet.payout, config.tablePrecision);
        break;
      case BetType.COME_ODDS: {
        const expectedOdds = winningComeOdds.shift();
        expect(expectedOdds).toBeDefined();
        expect(resolvedBet.placedBet.bet).toBe(expectedOdds!.odds);
        assertPassOddsPayout(expectedOdds!.point, resolvedBet.placedBet.bet, resolvedBet.payout, config.tablePrecision);
        break;
      }
      case BetType.DONTCOME_ODDS: {
        const expectedOdds = winningDontComeOdds.shift();
        expect(expectedOdds).toBeDefined();
        expect(resolvedBet.placedBet.bet).toBe(expectedOdds!.odds);
        assertDontOddsPayout(expectedOdds!.point, resolvedBet.placedBet.bet, resolvedBet.payout, config.tablePrecision);
        break;
      }
      case BetType.NUMBER_BET:
        assertNumberPayout(resolvedBet.placedBet.number!, resolvedBet.placedBet.bet, resolvedBet.payout, config.tablePrecision);
        break;
    }

    if (config.avoidRounding && (oddsBetTypes.has(resolvedBet.placedBet.type) || resolvedBet.placedBet.type === BetType.NUMBER_BET)) {
      expect(resolvedBet.payout % 1).toBe(0);
    }
  }
}

function assertPointTransition(previousState: GameState, nextState: GameState, roll: number) {
  if (!previousState.pointIsOn) {
    if (isCrapsPoint(roll)) {
      expect(nextState.pointIsOn).toBe(true);
      expect(nextState.point).toBe(roll);
    } else {
      expect(nextState.pointIsOn).toBe(false);
      expect(nextState.point).toBe(0);
    }
    return;
  }

  if (roll === previousState.point || roll === 7) {
    expect(nextState.pointIsOn).toBe(false);
    expect(nextState.point).toBe(0);
  } else {
    expect(nextState.pointIsOn).toBe(true);
    expect(nextState.point).toBe(previousState.point);
  }
}

function assertTerminalStateWhenNoFutureBetCanBePlaced(config: Configuration, nextState: GameState) {
  if (nextState.hasCurrentBet()) return;

  const minimumNextBet = minimumConfiguredBet(config);
  const availableAboveFloor = config.bankrollMinimum !== null && config.bankrollMinimum > 0
    ? nextState.bankroll - config.bankrollMinimum
    : nextState.bankroll;

  if (availableAboveFloor < minimumNextBet) {
    expect(nextState.isDone()).toBe(true);
  }
}

function addRollToLedger(result: RollResult, ledger: LedgerStats) {
  for (const resolvedBet of result.resolvedBets) {
    if (resolvedBet.outcome === BetOutcome.WIN) {
      ledger.cumulativeWinnings += resolvedBet.payout;
    } else if (resolvedBet.outcome === BetOutcome.LOSS) {
      ledger.cumulativeLosses += resolvedBet.placedBet.bet;
    }
  }
}

function recordCoverage(tags: Set<string>, previousState: GameState, result: RollResult) {
  const placedState = result.placedBetState;
  const nextState = result.resultingState;

  tags.add(placedState.pointIsOn ? 'phase:point-on' : 'phase:come-out');

  if (!previousState.pointIsOn && nextState.pointIsOn) {
    tags.add('transition:point-established');
  }
  if (previousState.pointIsOn && !nextState.pointIsOn) {
    tags.add('transition:point-cleared');
  }

  for (const newBet of result.newBets) {
    tags.add(`new:${newBet.type}`);
  }

  for (const resolvedBet of result.resolvedBets) {
    const { type, number } = resolvedBet.placedBet;

    tags.add(`resolved:${type}:${resolvedBet.outcome}`);
    if (oddsBetTypes.has(type)) {
      tags.add(`resolved:odds:${resolvedBet.outcome}`);
    }
    if (type === BetType.NUMBER_BET) {
      tags.add(`resolved:number:${resolvedBet.outcome}`);
    }

    if (type === BetType.NUMBER_BET && number !== undefined && resolvedBet.outcome === BetOutcome.WIN) {
      const placedNumberBet = placedState.currentBets.numberBets.find(bet => bet.number === number);
      const nextNumberBet = nextState.currentBets.numberBets.find(bet => bet.number === number);

      if (!nextNumberBet) {
        tags.add('number:press-limit-cashout');
      } else if (placedNumberBet && nextNumberBet.bet > placedNumberBet.bet) {
        tags.add('number:pressed');
      }
    }
  }

  if (!placedState.pointIsOn && placedState.currentBets.numberBets.length > 0) {
    tags.add(placedState.configuration.leaveNumberBetsWorkingDuringComeOut
      ? 'number:come-out-working'
      : 'number:come-out-off');
  }

  const limit = nextState.limitReached();
  if (limit !== null) {
    tags.add(`limit:${limit}`);
  }
  if (previousState.limitReached() !== null && result.newBets.length === 0) {
    tags.add('limit:no-new-bets');
  }
}

function expectedOddsAmount(
  controllingBetValue: number,
  strategy: OddsBetStrategy,
  avoidRounding: boolean,
  precision: TablePrecision,
  dont: boolean,
  point: number
): number {
  switch (strategy.type) {
    case OddsBetStrategyType.NONE:
      return 0;
    case OddsBetStrategyType.SETAMOUNT:
      return avoidRounding
        ? cleanOddsAmount(strategy.amount, dont, point)
        : floorExpected(strategy.amount, precision);
    case OddsBetStrategyType.MULTIPLIER: {
      const raw = controllingBetValue * strategy.multiplier;
      return avoidRounding ? cleanOddsAmount(raw, dont, point) : floorExpected(raw, precision);
    }
    case OddsBetStrategyType.TABLEMAX:
      if (dont) return floorExpected(6 * controllingBetValue, precision);
      if (point === 4 || point === 10) return floorExpected(3 * controllingBetValue, precision);
      if (point === 5 || point === 9) return floorExpected(4 * controllingBetValue, precision);
      if (point === 6 || point === 8) return floorExpected(5 * controllingBetValue, precision);
      return 0;
  }
}

function cleanOddsAmount(amount: number, dont: boolean, point: number): number {
  if (!dont) {
    if (point === 4 || point === 10) return Math.ceil(amount);
    if (point === 5 || point === 9) return ceilToMultiple(amount, 2);
    return ceilToMultiple(amount, 5);
  }

  if (point === 4 || point === 10) return ceilToMultiple(amount, 2);
  if (point === 5 || point === 9) return ceilToMultiple(amount, 3);
  return ceilToMultiple(amount, 6);
}

function assertPassOddsPayout(point: number, bet: number, payout: number, precision: TablePrecision) {
  if (point === 4 || point === 10) expect(payout).toBeCloseTo(floorExpected(bet * 2, precision), 2);
  if (point === 5 || point === 9) expect(payout).toBeCloseTo(floorExpected(bet * 1.5, precision), 2);
  if (point === 6 || point === 8) expect(payout).toBeCloseTo(floorExpected(bet * 1.2, precision), 2);
}

function assertDontOddsPayout(point: number, bet: number, payout: number, precision: TablePrecision) {
  if (point === 4 || point === 10) expect(payout).toBeCloseTo(floorExpected(bet / 2, precision), 2);
  if (point === 5 || point === 9) expect(payout).toBeCloseTo(floorExpected(bet * (2 / 3), precision), 2);
  if (point === 6 || point === 8) expect(payout).toBeCloseTo(floorExpected(bet * (5 / 6), precision), 2);
}

function assertNumberPayout(number: CrapsNumber, bet: number, payout: number, precision: TablePrecision) {
  const rawPayout = number === 4 || number === 10
    ? bet * 39 / 20
    : number === 5 || number === 9
      ? bet * 7 / 5
      : bet * 7 / 6;

  expect(payout).toBeCloseTo(floorExpected(rawPayout, precision), 2);
}

function minimumConfiguredBet(config: Configuration): number {
  const possibleBets: number[] = [
    config.passBet,
    config.dontPassBet,
    config.comeBet,
    config.dontComeBet,
    ...CRAPS_NUMBERS.map(number => config.effectiveNumberBet(number)),
  ].filter((amount): amount is number => amount !== null && amount > 0);

  return Math.min(...possibleBets);
}

function emptyOutcomeCounts(): OutcomeCounts {
  return {
    [BetOutcome.WIN]: 0,
    [BetOutcome.LOSS]: 0,
    [BetOutcome.PUSH]: 0,
  };
}

function isCrapsPoint(roll: number): roll is CrapsNumber {
  return (CRAPS_NUMBERS as readonly number[]).includes(roll);
}

function cleanNumberBetUnit(number: CrapsNumber): number {
  if (number === 6 || number === 8) return 6;
  if (number === 5 || number === 9) return 5;
  return 20;
}

function ceilToMultiple(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

function floorExpected(value: number, precision: TablePrecision): number {
  if (precision === TablePrecision.DOLLAR) return Math.floor(value);
  return Math.floor(Number((value * 100).toPrecision(15))) / 100;
}
