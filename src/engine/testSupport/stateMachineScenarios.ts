import { Configuration, ConfigurationProps, NumberBetConfiguration } from '../Configuration';
import { CRAPS_NUMBERS, CrapsNumber } from '../NumberBets';
import { TablePrecision } from '../Money';
import { OddsBetStrategy, OddsBetStrategyType, PressStrategy, PressStrategyType } from '../Strategies';

export type StateMachineScenario = {
  name: string;
  config: Configuration;
  rolls: number[];
};

export const noPress: PressStrategy = { type: PressStrategyType.NO_PRESS };
export const noOdds: OddsBetStrategy = { type: OddsBetStrategyType.NONE };
export const setOdds10: OddsBetStrategy = { type: OddsBetStrategyType.SETAMOUNT, amount: 10 };
export const setOdds12: OddsBetStrategy = { type: OddsBetStrategyType.SETAMOUNT, amount: 12 };

export const emptyNumberBets = (): Record<CrapsNumber, NumberBetConfiguration> => Object.fromEntries(
  CRAPS_NUMBERS.map(number => [number, { amount: null, pressStrategy: noPress }])
) as Record<CrapsNumber, NumberBetConfiguration>;

export const baseConfigProps: ConfigurationProps = {
  initialBankroll: 300,
  bankrollMinimum: 50,
  bankrollMaximum: null,
  maximumRolls: null,
  passBet: 15,
  passBetOddsStrategy: noOdds,
  comeBet: null,
  maxComeBets: 3,
  comeBetOddsStrategy: noOdds,
  comeBetOddsWorkingComeOut: false,
  dontPassBet: null,
  dontPassBetOddsStrategy: noOdds,
  dontComeBet: null,
  maxDontComeBets: 3,
  dontComeBetOddsStrategy: noOdds,
  dontComeBetOddsWorkingComeOut: false,
  numberBets: emptyNumberBets(),
  pressLimit: null,
  placeNumberBetsDuringComeOut: false,
  leaveNumberBetsWorkingDuringComeOut: false,
  omitNumberBetOnPoint: true,
  avoidRounding: true,
  tablePrecision: TablePrecision.DOLLAR,
  simulationCount: 1,
};

export type ConfigurationOverrides = Partial<Omit<ConfigurationProps, 'numberBets'>> & {
  numberBets?: Partial<Record<CrapsNumber, NumberBetConfiguration>>;
};

export function makeConfig(overrides: ConfigurationOverrides = {}): Configuration {
  return new Configuration({
    ...baseConfigProps,
    ...overrides,
    numberBets: { ...baseConfigProps.numberBets, ...overrides.numberBets },
  });
}

const scenario = (name: string, config: Configuration, rolls: number[]): StateMachineScenario => ({
  name,
  config,
  rolls,
});

const pointMatrixScenarios = CRAPS_NUMBERS.flatMap(point => [
  scenario(
    `pass line with odds hits point ${point}`,
    makeConfig({ bankrollMinimum: null, passBet: 10, passBetOddsStrategy: setOdds10 }),
    [point, point]
  ),
  scenario(
    `pass line with odds sevens out from point ${point}`,
    makeConfig({ bankrollMinimum: null, passBet: 10, passBetOddsStrategy: setOdds10 }),
    [point, 7]
  ),
  scenario(
    `don't pass with odds wins from point ${point}`,
    makeConfig({
      bankrollMinimum: null,
      passBet: null,
      dontPassBet: 10,
      dontPassBetOddsStrategy: setOdds12,
    }),
    [point, 7]
  ),
  scenario(
    `don't pass with odds loses to point ${point}`,
    makeConfig({
      bankrollMinimum: null,
      passBet: null,
      dontPassBet: 10,
      dontPassBetOddsStrategy: setOdds12,
    }),
    [point, point]
  ),
]);

export const stateMachineScenarios: StateMachineScenario[] = [
  ...pointMatrixScenarios,
  scenario(
    'pass line natural wins on come-out',
    makeConfig({ bankrollMinimum: null, passBet: 10 }),
    [7]
  ),
  scenario(
    'pass line craps loses on come-out',
    makeConfig({ bankrollMinimum: null, passBet: 10 }),
    [2]
  ),
  scenario(
    "don't pass pushes on come-out 12",
    makeConfig({ bankrollMinimum: null, passBet: null, dontPassBet: 10 }),
    [12]
  ),
  scenario(
    'come bet establishes and wins from its own point',
    makeConfig({
      bankrollMinimum: null,
      passBet: 10,
      comeBet: 10,
      maxComeBets: 2,
      comeBetOddsStrategy: setOdds10,
      avoidRounding: false,
    }),
    [6, 5, 5]
  ),
  scenario(
    'come odds are off on come-out unless configured working',
    makeConfig({
      bankrollMinimum: null,
      passBet: 10,
      comeBet: 10,
      maxComeBets: 2,
      comeBetOddsStrategy: setOdds10,
      comeBetOddsWorkingComeOut: false,
      avoidRounding: false,
    }),
    [6, 5, 6, 5]
  ),
  scenario(
    'fresh come bet loses on craps',
    makeConfig({ bankrollMinimum: null, passBet: 10, comeBet: 10 }),
    [6, 2]
  ),
  scenario(
    'fresh and established come bets differ on seven-out',
    makeConfig({ bankrollMinimum: null, passBet: 10, comeBet: 10, maxComeBets: 2 }),
    [6, 5, 7]
  ),
  scenario(
    "don't come bet establishes and wins on seven",
    makeConfig({
      bankrollMinimum: null,
      passBet: 10,
      dontComeBet: 10,
      maxDontComeBets: 2,
      dontComeBetOddsStrategy: setOdds12,
      avoidRounding: false,
    }),
    [6, 5, 7]
  ),
  scenario(
    "don't come bet loses when its point repeats",
    makeConfig({
      bankrollMinimum: null,
      passBet: 10,
      dontComeBet: 10,
      maxDontComeBets: 2,
      dontComeBetOddsStrategy: setOdds12,
      avoidRounding: false,
    }),
    [6, 5, 5]
  ),
  scenario(
    "fresh don't come bet pushes on 12",
    makeConfig({ bankrollMinimum: null, passBet: 10, dontComeBet: 10 }),
    [6, 12]
  ),
  scenario(
    'number bet placed on come-out is off and returned when it becomes the point',
    makeConfig({
      bankrollMinimum: null,
      passBet: null,
      numberBets: { 6: { amount: 6, pressStrategy: noPress } },
      placeNumberBetsDuringComeOut: true,
      leaveNumberBetsWorkingDuringComeOut: false,
    }),
    [6]
  ),
  scenario(
    'working come-out number bet wins and presses',
    makeConfig({
      bankrollMinimum: null,
      passBet: null,
      numberBets: { 6: { amount: 6, pressStrategy: { type: PressStrategyType.FULL_PRESS } } },
      placeNumberBetsDuringComeOut: true,
      leaveNumberBetsWorkingDuringComeOut: true,
      omitNumberBetOnPoint: false,
    }),
    [6]
  ),
  scenario(
    'press limit cashes out a winning number bet',
    makeConfig({
      bankrollMinimum: null,
      passBet: null,
      numberBets: { 6: { amount: 6, pressStrategy: noPress } },
      placeNumberBetsDuringComeOut: true,
      leaveNumberBetsWorkingDuringComeOut: true,
      pressLimit: 1,
      omitNumberBetOnPoint: false,
    }),
    [6]
  ),
  scenario(
    'number bet loses on seven-out',
    makeConfig({
      bankrollMinimum: null,
      passBet: 10,
      numberBets: { 8: { amount: 6, pressStrategy: noPress } },
    }),
    [6, 7]
  ),
  scenario(
    'bankroll floor stops new bets but lets outstanding bets resolve',
    makeConfig({
      initialBankroll: 100,
      bankrollMinimum: 50,
      passBet: 50,
    }),
    [4, 4]
  ),
  scenario(
    'bankroll goal stops after outstanding bets resolve',
    makeConfig({
      initialBankroll: 100,
      bankrollMinimum: null,
      bankrollMaximum: 110,
      passBet: 10,
    }),
    [4, 4]
  ),
  scenario(
    'busted bankroll stops when no next bet can be placed',
    makeConfig({
      initialBankroll: 10,
      bankrollMinimum: null,
      passBet: 10,
    }),
    [2]
  ),
  scenario(
    'roll limit stops after configured maximum rolls',
    makeConfig({
      initialBankroll: 100,
      bankrollMinimum: null,
      maximumRolls: 1,
      passBet: 10,
    }),
    [7]
  ),
];
