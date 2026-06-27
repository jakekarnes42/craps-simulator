import { describe, expect, it } from 'vitest';
import { Configuration } from '../../../engine/Configuration';
import { GameState, sumBetCollection } from '../../../engine/GameState';
import {
  BetOutcome,
  BetType,
  createEmptyBetAttribution,
  executeRoll,
  SessionAnalytics,
} from '../../../engine/Session';
import { AVG_SECONDS_PER_ROLL } from '../../../shared/format';
import { analyzeBulkSessions } from './analyzeBulkSessions';

function runSession(config: Configuration, rolls: number[]): SessionAnalytics {
  let state = GameState.init(config);
  let peakEquity = config.initialBankroll ?? 0;
  let maxDrawdown = 0;
  let rollCount = 0;
  const betAttribution = createEmptyBetAttribution();

  for (const roll of rolls) {
    if (state.isDone()) break;

    const result = executeRoll(state, roll);
    rollCount += 1;

    const equity = result.resultingState.bankroll + sumBetCollection(result.resultingState.currentBets);
    if (equity > peakEquity) peakEquity = equity;
    maxDrawdown = Math.max(maxDrawdown, peakEquity - equity);

    for (const resolvedBet of result.resolvedBets) {
      const attribution = betAttribution[resolvedBet.placedBet.type];
      attribution.wagered += resolvedBet.placedBet.bet;
      if (resolvedBet.outcome === BetOutcome.WIN) {
        attribution.won += resolvedBet.payout;
      } else if (resolvedBet.outcome === BetOutcome.LOSS) {
        attribution.lost += resolvedBet.placedBet.bet;
      }
    }

    state = result.resultingState;
  }

  const stopReason = state.limitReached();
  if (stopReason === null) {
    throw new Error(`Scripted test session did not reach a limit: ${rolls.join(', ')}`);
  }

  return {
    finalState: state,
    stopReason,
    rollCount,
    maxDrawdown,
    betAttribution,
  };
}

const analysisConfig = () => Configuration.defaultConfiguration()
  .setInitialBankroll(100)
  .setBankrollMinimum(80)
  .setBankrollMaximum(120)
  .setMaximumRolls(3)
  .setPassBet(10);

describe('bulk session analysis', () => {
  it('summarizes outcomes, duration, profit, and bet contribution from deterministic sessions', () => {
    const config = analysisConfig();
    const sessions = [
      runSession(config, [7, 7]),
      runSession(config, [2, 2]),
      runSession(config, [4, 5, 6, 7]),
    ];

    const analysis = analyzeBulkSessions(sessions);

    expect(analysis).not.toBeNull();
    expect(analysis!.summary.sessionCount).toBe(3);
    expect(analysis!.summary.averageProfit).toBeCloseTo(-10 / 3, 2);
    expect(analysis!.summary.medianProfit).toBe(-10);
    expect(analysis!.summary.profitableCount).toBe(1);
    expect(analysis!.summary.profitablePercentage).toBeCloseTo(100 / 3, 2);
    expect(analysis!.summary.medianRolls).toBe(2);
    expect(analysis!.summary.hourlyProfit).toBeCloseTo(-10 / (8 * AVG_SECONDS_PER_ROLL / 3600), 2);

    expect(Object.fromEntries(analysis!.outcomes.map(outcome => [outcome.id, outcome.count]))).toEqual({
      goal: 1,
      floor: 1,
      'roll-limit': 1,
    });
    expect(Object.fromEntries(analysis!.outcomes.map(outcome => [outcome.id, outcome.medianRolls]))).toEqual({
      goal: 2,
      floor: 2,
      'roll-limit': 4,
    });

    expect(analysis!.durationTrend[0]).toEqual({ roll: 0, stillPlaying: 100 });
    expect(analysis!.durationTrend[analysis!.durationTrend.length - 1]).toEqual({ roll: 4, stillPlaying: 0 });

    const passLinePerformance = analysis!.betPerformance.find(performance => performance.type === BetType.PASSLINE);
    expect(passLinePerformance).toBeDefined();
    expect(passLinePerformance!.averageWagered).toBeCloseTo(50 / 3, 2);
    expect(passLinePerformance!.averageNet).toBeCloseTo(-10 / 3, 2);
    expect(passLinePerformance!.hourlyNet).toBeCloseTo(-100, 2);
    expect(passLinePerformance!.netPerHundredWagered).toBeCloseTo(-20, 2);
    expect(passLinePerformance!.signal).toBe('uncertain');
  });
});
