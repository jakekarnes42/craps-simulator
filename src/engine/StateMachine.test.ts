import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Configuration } from './Configuration';
import { GameState } from './GameState';
import { TablePrecision } from './Money';
import { BetOutcome, BetType, executeRoll } from './Session';
import { OddsBetStrategy, OddsBetStrategyType, PressStrategy, PressStrategyType } from './Strategies';
import {
  assertGeneratedRolls,
  assertRequiredStateMachineCoverage,
  mergeCoverage,
  outcomeCountsFor,
  runScenario,
} from './testSupport/stateMachineHarness';
import {
  makeConfig,
  noOdds,
  noPress,
  stateMachineScenarios,
  StateMachineScenario,
} from './testSupport/stateMachineScenarios';

const tablePrecisionArbitrary = fc.constantFrom(TablePrecision.DOLLAR, TablePrecision.CENT);

const oddsStrategyArbitrary: fc.Arbitrary<OddsBetStrategy> = fc.oneof(
  fc.constant(noOdds),
  fc.record({
    type: fc.constant(OddsBetStrategyType.SETAMOUNT),
    amount: fc.integer({ min: 1, max: 10 }),
  }),
  fc.record({
    type: fc.constant(OddsBetStrategyType.MULTIPLIER),
    multiplier: fc.integer({ min: 1, max: 10 }),
  }),
  fc.constant({ type: OddsBetStrategyType.TABLEMAX } as const),
);

const pressStrategyArbitrary: fc.Arbitrary<PressStrategy> = fc.oneof(
  fc.constant(noPress),
  fc.record({
    type: fc.constant(PressStrategyType.PRESS_UNTIL),
    target: fc.integer({ min: 1, max: 100 }),
  }),
  fc.constant({ type: PressStrategyType.HALF_PRESS } as const),
  fc.constant({ type: PressStrategyType.FULL_PRESS } as const),
  fc.constant({ type: PressStrategyType.POWER_PRESS } as const),
);

const numberBetConfigurationArbitrary = fc.record({
  amount: fc.option(fc.integer({ min: 5, max: 60 }), { nil: null }),
  pressStrategy: pressStrategyArbitrary,
});

const configArbitrary = fc.record({
  initialBankroll: fc.integer({ min: 50, max: 2000 }),
  bankrollMinimum: fc.option(fc.integer({ min: 0, max: 300 }), { nil: null }),
  bankrollMaximum: fc.option(fc.integer({ min: 60, max: 3000 }), { nil: null }),
  maximumRolls: fc.option(fc.integer({ min: 1, max: 80 }), { nil: null }),
  passBet: fc.option(fc.integer({ min: 5, max: 60 }), { nil: null }),
  passBetOddsStrategy: oddsStrategyArbitrary,
  comeBet: fc.option(fc.integer({ min: 5, max: 60 }), { nil: null }),
  maxComeBets: fc.integer({ min: 1, max: 5 }),
  comeBetOddsStrategy: oddsStrategyArbitrary,
  comeBetOddsWorkingComeOut: fc.boolean(),
  dontPassBet: fc.option(fc.integer({ min: 5, max: 60 }), { nil: null }),
  dontPassBetOddsStrategy: oddsStrategyArbitrary,
  dontComeBet: fc.option(fc.integer({ min: 5, max: 60 }), { nil: null }),
  maxDontComeBets: fc.integer({ min: 1, max: 5 }),
  dontComeBetOddsStrategy: oddsStrategyArbitrary,
  dontComeBetOddsWorkingComeOut: fc.boolean(),
  numberBets: fc.record({
    4: numberBetConfigurationArbitrary,
    5: numberBetConfigurationArbitrary,
    6: numberBetConfigurationArbitrary,
    8: numberBetConfigurationArbitrary,
    9: numberBetConfigurationArbitrary,
    10: numberBetConfigurationArbitrary,
  }),
  pressLimit: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
  placeNumberBetsDuringComeOut: fc.boolean(),
  leaveNumberBetsWorkingDuringComeOut: fc.boolean(),
  omitNumberBetOnPoint: fc.boolean(),
  avoidRounding: fc.boolean(),
  tablePrecision: tablePrecisionArbitrary,
  simulationCount: fc.constant(1),
}).map(props => new Configuration(props));

const validConfigArbitrary = configArbitrary.filter(config => config.getInvalidFields().length === 0);

const generatedRollsArbitrary = fc.array(fc.integer({ min: 2, max: 12 }), {
  minLength: 1,
  maxLength: 80,
});

const canonicalRollScripts = [
  [7],
  [2],
  [12],
  [6, 6],
  [6, 7],
  [6, 5, 5],
  [6, 5, 7],
  [6, 5, 6, 5],
];

const rollScriptArbitrary = fc.oneof(
  generatedRollsArbitrary,
  fc.constantFrom(...canonicalRollScripts).map(rolls => [...rolls]),
);

const generatedScenarioArbitrary: fc.Arbitrary<StateMachineScenario> = fc.oneof(
  fc.constantFrom(...stateMachineScenarios).map(scenario => ({
    name: scenario.name,
    config: scenario.config,
    rolls: [...scenario.rolls],
  })),
  fc.record({
    name: fc.constant('generated strategy'),
    config: validConfigArbitrary,
    rolls: rollScriptArbitrary,
  }),
);

describe('craps state machine', () => {
  it('validates the curated rules catalog and proves broad state-machine coverage', () => {
    const runs = stateMachineScenarios.map(runScenario);

    expect(runs.every(run => run.results.length > 0)).toBe(true);
    assertRequiredStateMachineCoverage(mergeCoverage(runs));
  });

  it('preserves state-machine invariants across generated valid strategies and roll scripts', () => {
    fc.assert(
      fc.property(generatedScenarioArbitrary, ({ config, rolls }) => {
        expect(config.getInvalidFields()).toEqual([]);
        assertGeneratedRolls(config, rolls);
      }),
      {
        numRuns: 3000,
        examples: stateMachineScenarios.map((scenario): [StateMachineScenario] => [{
          name: scenario.name,
          config: scenario.config,
          rolls: [...scenario.rolls],
        }]),
      }
    );
  }, 15000);

  it('keeps a reached bankroll floor sticky while outstanding bets resolve', () => {
    const config = makeConfig({
      initialBankroll: 100,
      bankrollMinimum: 50,
      passBet: 50,
    });

    const firstRoll = executeRoll(GameState.init(config), 4);
    expect(firstRoll.resultingState.limitReached()).not.toBeNull();
    expect(firstRoll.resultingState.hasCurrentBet()).toBe(true);

    const secondRoll = executeRoll(firstRoll.resultingState, 4);
    expect(secondRoll.newBets).toHaveLength(0);
    expect(secondRoll.resultingState.bankroll).toBe(150);
    expect(secondRoll.resultingState.limitReached()).toBe(firstRoll.resultingState.limitReached());
    expect(secondRoll.resultingState.isDone()).toBe(true);
  });

  it('returns or resolves come-out number bets according to their working setting', () => {
    for (const leaveWorking of [false, true]) {
      const config = makeConfig({
        bankrollMinimum: null,
        passBet: null,
        numberBets: { 6: { amount: 6, pressStrategy: noPress } },
        placeNumberBetsDuringComeOut: true,
        leaveNumberBetsWorkingDuringComeOut: leaveWorking,
        omitNumberBetOnPoint: true,
      });

      const result = executeRoll(GameState.init(config), 6);

      expect(result.resultingState.point).toBe(6);
      expect(result.resultingState.currentBets.numberBets).toHaveLength(0);
      expect(result.resultingState.bankroll).toBe(leaveWorking ? 307 : 300);
    }
  });

  it('distinguishes fresh Come bets from established Come bets on a seven-out', () => {
    const config = makeConfig({
      passBet: 10,
      comeBet: 10,
      maxComeBets: 2,
      bankrollMinimum: null,
      avoidRounding: false,
    });

    let state = GameState.init(config);
    state = executeRoll(state, 6).resultingState;
    state = executeRoll(state, 5).resultingState;
    const sevenOut = executeRoll(state, 7);

    expect(outcomeCountsFor(sevenOut, BetType.COME)).toMatchObject({
      [BetOutcome.WIN]: 1,
      [BetOutcome.LOSS]: 1,
    });
  });

  it('uses effective number-bet amounts and per-number press strategies through real rolls', () => {
    const config = makeConfig({
      passBet: null,
      bankrollMinimum: null,
      numberBets: {
        4: { amount: 5, pressStrategy: { type: PressStrategyType.NO_PRESS } },
        6: { amount: 6, pressStrategy: { type: PressStrategyType.FULL_PRESS } },
      },
      placeNumberBetsDuringComeOut: true,
      leaveNumberBetsWorkingDuringComeOut: true,
      omitNumberBetOnPoint: false,
    });

    const firstRoll = executeRoll(GameState.init(config), 4);

    expect(firstRoll.newBets).toEqual(expect.arrayContaining([
      { type: BetType.NUMBER_BET, bet: 20, number: 4 },
      { type: BetType.NUMBER_BET, bet: 6, number: 6 },
    ]));
    expect(firstRoll.resolvedBets.find(bet => bet.placedBet.type === BetType.NUMBER_BET && bet.placedBet.number === 4)).toMatchObject({
      outcome: BetOutcome.WIN,
      payout: 39,
    });
    expect(firstRoll.resultingState.bankroll).toBe(313);

    const secondRoll = executeRoll(firstRoll.resultingState, 6);
    const pressedSix = secondRoll.resultingState.currentBets.numberBets.find(bet => bet.number === 6);

    expect(secondRoll.resolvedBets.find(bet => bet.placedBet.type === BetType.NUMBER_BET && bet.placedBet.number === 6)).toMatchObject({
      outcome: BetOutcome.WIN,
      payout: 7,
    });
    expect(pressedSix?.bet).toBe(12);
    expect(secondRoll.resultingState.bankroll).toBe(314);
  });

  it('pays Come and Don\'t Come odds from their established come points', () => {
    const comeConfig = makeConfig({
      passBet: 10,
      comeBet: 10,
      maxComeBets: 1,
      comeBetOddsStrategy: { type: OddsBetStrategyType.SETAMOUNT, amount: 5 },
      bankrollMinimum: null,
      avoidRounding: false,
      tablePrecision: TablePrecision.DOLLAR,
    });

    let state = GameState.init(comeConfig);
    state = executeRoll(state, 6).resultingState;
    state = executeRoll(state, 5).resultingState;
    const comePointHit = executeRoll(state, 5);
    const comeOddsWin = comePointHit.resolvedBets.find(bet => bet.placedBet.type === BetType.COME_ODDS);

    expect(comeOddsWin?.outcome).toBe(BetOutcome.WIN);
    expect(comeOddsWin?.payout).toBe(7);

    const dontComeConfig = makeConfig({
      passBet: 10,
      dontComeBet: 10,
      maxDontComeBets: 1,
      dontComeBetOddsStrategy: { type: OddsBetStrategyType.SETAMOUNT, amount: 12 },
      bankrollMinimum: null,
      avoidRounding: false,
      tablePrecision: TablePrecision.DOLLAR,
    });

    state = GameState.init(dontComeConfig);
    state = executeRoll(state, 6).resultingState;
    state = executeRoll(state, 5).resultingState;
    const sevenOut = executeRoll(state, 7);
    const dontComeOddsWin = sevenOut.resolvedBets.find(bet => bet.placedBet.type === BetType.DONTCOME_ODDS);

    expect(dontComeOddsWin?.outcome).toBe(BetOutcome.WIN);
    expect(dontComeOddsWin?.payout).toBe(8);
  });
});
