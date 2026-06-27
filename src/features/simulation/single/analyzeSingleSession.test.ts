import { describe, expect, it } from 'vitest';
import { Configuration } from '../../../engine/Configuration';
import { GameState } from '../../../engine/GameState';
import { executeRoll, RollResult } from '../../../engine/Session';
import { OddsBetStrategyType } from '../../../engine/Strategies';
import { analyzeSingleSession } from './analyzeSingleSession';

function runRolls(config: Configuration, rolls: number[]): RollResult[] {
  let state = GameState.init(config);
  return rolls.map(roll => {
    const result = executeRoll(state, roll);
    state = result.resultingState;
    return result;
  });
}

const passLineWithOdds = () => Configuration.defaultConfiguration()
  .setBankrollMinimum(null)
  .setBankrollMaximum(null)
  .setMaximumRolls(null)
  .setPassBet(10)
  .setPassBetOddsStrategy({ type: OddsBetStrategyType.SETAMOUNT, amount: 50 });

describe('single session analysis', () => {
  it('separates wager placement, cash movement, and true equity change', () => {
    const analysis = analyzeSingleSession(runRolls(passLineWithOdds(), [8, 6, 8]));

    expect(analysis).not.toBeNull();
    const oddsPlacement = analysis!.ledgerRows[1];
    const pointHit = analysis!.ledgerRows[2];

    expect(oddsPlacement.placedAmount).toBe(50);
    expect(oddsPlacement.cashDelta).toBe(-50);
    expect(oddsPlacement.exposureAtRoll).toBe(60);
    expect(oddsPlacement.resolvedNet).toBe(0);
    expect(oddsPlacement.equityDelta).toBe(0);

    expect(pointHit.cashDelta).toBe(130);
    expect(pointHit.resolvedNet).toBe(70);
    expect(pointHit.equityDelta).toBe(70);
    expect(analysis!.summary.profit).toBe(70);
    expect(analysis!.summary.maxExposure).toBe(60);
    expect(analysis!.summary.peakEquity).toBe(370);
    expect(analysis!.trend).toHaveLength(4);
  });
});
