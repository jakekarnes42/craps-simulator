import { LimitReached } from '../../../engine/GameState';
import { BetType, SessionAnalytics } from '../../../engine/Session';
import { AVG_SECONDS_PER_ROLL } from '../../../shared/format';
import { computeDistributionStats, DistributionStats } from '../../../shared/statistics';

export type BulkOutcomeId = 'goal' | 'floor' | 'busted' | 'roll-limit';

export type BulkOutcome = {
  id: BulkOutcomeId;
  label: string;
  configuredValue: number | null;
  count: number;
  percentage: number;
  medianRolls: number | null;
};

export type BulkDurationTrendPoint = {
  roll: number;
  stillPlaying: number;
};

export type BulkBetPerformance = {
  type: BetType;
  averageWagered: number;
  averageNet: number;
  hourlyNet: number;
  netPerHundredWagered: number;
  signal: 'positive' | 'negative' | 'uncertain';
};

export type BulkSessionSummary = {
  sessionCount: number;
  initialBankroll: number;
  averageProfit: number;
  medianProfit: number;
  profitablePercentage: number;
  profitableCount: number;
  hourlyProfit: number;
  medianMaxDrawdown: number;
  p90MaxDrawdown: number;
  medianRolls: number;
};

export type BulkSessionAnalysis = {
  summary: BulkSessionSummary;
  outcomes: BulkOutcome[];
  durationTrend: BulkDurationTrendPoint[];
  betPerformance: BulkBetPerformance[];
  profitStats: DistributionStats;
  rollStats: DistributionStats;
};

const outcomeIdFor = (limit: LimitReached): BulkOutcomeId => {
  switch (limit) {
    case LimitReached.BANKROLL_MAX: return 'goal';
    case LimitReached.BANKROLL_MIN: return 'floor';
    case LimitReached.BUSTED: return 'busted';
    case LimitReached.MAX_ROLLS: return 'roll-limit';
  }
};

const outcomeLabels: Record<BulkOutcomeId, string> = {
  goal: 'Bankroll Goal',
  floor: 'Bankroll Floor',
  busted: 'Busted',
  'roll-limit': 'Roll Limit',
};

const percentage = (count: number, total: number): number => total === 0 ? 0 : (count / total) * 100;

const buildDurationTrend = (rollCounts: number[]): BulkDurationTrendPoint[] => {
  const sortedRolls = [...rollCounts].sort((left, right) => left - right);
  const maximumRolls = sortedRolls[sortedRolls.length - 1];
  const step = Math.max(1, Math.ceil(maximumRolls / 80));
  const rolls = Array.from(
    { length: Math.floor(maximumRolls / step) + 1 },
    (_, index) => index * step
  );

  if (rolls[rolls.length - 1] !== maximumRolls) rolls.push(maximumRolls);

  let completed = 0;
  return rolls.map(roll => {
    while (completed < sortedRolls.length && sortedRolls[completed] <= roll) {
      completed++;
    }

    return {
      roll,
      stillPlaying: percentage(sortedRolls.length - completed, sortedRolls.length),
    };
  });
};

const buildBetPerformance = (
  results: SessionAnalytics[],
  totalHours: number
): BulkBetPerformance[] => {
  const totals = new Map<BetType, { wagered: number; won: number; lost: number }>();

  for (const result of results) {
    for (const [type, attribution] of Object.entries(result.betAttribution) as Array<
      [BetType, { wagered: number; won: number; lost: number }]
    >) {
      const total = totals.get(type) ?? { wagered: 0, won: 0, lost: 0 };
      total.wagered += attribution.wagered;
      total.won += attribution.won;
      total.lost += attribution.lost;
      totals.set(type, total);
    }
  }

  return [...totals.entries()]
    .filter(([, total]) => total.wagered > 0)
    .map(([type, total]) => {
      const net = total.won - total.lost;
      const sessionNets = results.map(result => {
        const attribution = result.betAttribution[type];
        return attribution.won - attribution.lost;
      });
      const netStats = computeDistributionStats(sessionNets);
      const confidenceMargin = 1.96 * netStats.standardDeviation / Math.sqrt(results.length);
      const confidenceLow = netStats.mean - confidenceMargin;
      const confidenceHigh = netStats.mean + confidenceMargin;

      return {
        type,
        averageWagered: total.wagered / results.length,
        averageNet: net / results.length,
        hourlyNet: totalHours === 0 ? 0 : net / totalHours,
        netPerHundredWagered: net / total.wagered * 100,
        signal: confidenceLow > 0
          ? 'positive' as const
          : confidenceHigh < 0
            ? 'negative' as const
            : 'uncertain' as const,
      };
    })
    .sort((left, right) => right.averageNet - left.averageNet);
};

export const analyzeBulkSessions = (results: SessionAnalytics[]): BulkSessionAnalysis | null => {
  if (results.length === 0) return null;

  const initialBankroll = results[0].finalState.configuration.initialBankroll ?? 0;
  const configuration = results[0].finalState.configuration;
  const profits = results.map(result => result.finalState.bankroll - initialBankroll);
  const rollCounts = results.map(result => result.rollCount);
  const drawdowns = results.map(result => result.maxDrawdown);
  const profitStats = computeDistributionStats(profits, 10);
  const rollStats = computeDistributionStats(rollCounts, 10);
  const drawdownStats = computeDistributionStats(drawdowns);
  const sessions = results.map(result => ({
    outcome: outcomeIdFor(result.stopReason),
    rollCount: result.rollCount,
  }));
  const outcomes = (Object.keys(outcomeLabels) as BulkOutcomeId[])
    .map((id): BulkOutcome => {
      const matchingRolls = sessions
        .filter(session => session.outcome === id)
        .map(session => session.rollCount);

      return {
        id,
        label: outcomeLabels[id],
        configuredValue: id === 'goal'
          ? configuration.bankrollMaximum
          : id === 'floor'
            ? configuration.bankrollMinimum
            : id === 'roll-limit'
              ? configuration.maximumRolls
              : null,
        count: matchingRolls.length,
        percentage: percentage(matchingRolls.length, results.length),
        medianRolls: matchingRolls.length === 0
          ? null
          : computeDistributionStats(matchingRolls).median,
      };
    })
    .filter(outcome => outcome.count > 0);
  const profitableCount = profits.filter(profit => profit > 0).length;
  const totalHours = rollCounts.reduce((sum, rolls) => sum + rolls, 0) * AVG_SECONDS_PER_ROLL / 3600;

  return {
    summary: {
      sessionCount: results.length,
      initialBankroll,
      averageProfit: profitStats.mean,
      medianProfit: profitStats.median,
      profitablePercentage: percentage(profitableCount, results.length),
      profitableCount,
      hourlyProfit: totalHours === 0
        ? 0
        : profits.reduce((sum, profit) => sum + profit, 0) / totalHours,
      medianMaxDrawdown: drawdownStats.median,
      p90MaxDrawdown: drawdownStats.p90,
      medianRolls: rollStats.median,
    },
    outcomes,
    durationTrend: buildDurationTrend(rollCounts),
    betPerformance: buildBetPerformance(results, totalHours),
    profitStats,
    rollStats,
  };
};
