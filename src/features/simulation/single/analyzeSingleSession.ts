import { LimitReached, sumBetCollection } from '../../../engine/GameState';
import { BetOutcome, RollResult } from '../../../engine/Session';

export type EventTone = 'positive' | 'negative' | 'neutral' | 'attention';

export type SessionTrendPoint = {
  roll: number;
  cash: number;
  equity: number;
  exposure: number;
};

export type SessionKeyEvent = {
  id: string;
  label: string;
  value: number | string;
  signed: boolean;
  rollLabel: string | null;
  tone: EventTone;
  detail: string;
};

export type SingleSessionLedgerRow = {
  id: string;
  eventKey: string;
  result: RollResult;
  rollNumber: number;
  dice: number;
  outcomeLabel: string;
  outcomeTone: EventTone;
  pointBefore: number | null;
  pointAfter: number | null;
  cashBefore: number;
  cashAfterPlacement: number;
  cashAfter: number;
  exposureBefore: number;
  exposureAtRoll: number;
  exposureAfter: number;
  equityBefore: number;
  equityAtRoll: number;
  equityAfter: number;
  placedAmount: number;
  cashDelta: number;
  resolvedNet: number;
  equityDelta: number;
};

export type SingleSessionSummary = {
  initialBankroll: number;
  finalCash: number;
  finalEquity: number;
  profit: number;
  stopReason: LimitReached | null;
  totalRolls: number;
  peakEquity: number;
  peakEquityRoll: number;
  maxDrawdown: number;
  maxDrawdownRoll: number | null;
  maxExposure: number;
  maxExposureRoll: number | null;
};

export type SingleSessionAnalysis = {
  summary: SingleSessionSummary;
  trend: SessionTrendPoint[];
  keyEvents: SessionKeyEvent[];
  ledgerRows: SingleSessionLedgerRow[];
};

type Streak = {
  count: number;
  sum: number;
  startRoll: number | null;
  endRoll: number | null;
};

const emptyStreak = (): Streak => ({
  count: 0,
  sum: 0,
  startRoll: null,
  endRoll: null,
});

const exposure = (result: RollResult, phase: 'before' | 'atRoll' | 'after'): number => {
  if (phase === 'before') return sumBetCollection(result.initialState.currentBets);
  if (phase === 'atRoll') return sumBetCollection(result.placedBetState.currentBets);
  return sumBetCollection(result.resultingState.currentBets);
};

const equity = (cash: number, tableExposure: number): number => cash + tableExposure;

const resolvedNet = (result: RollResult): number => (
  result.resolvedBets.reduce((total, bet) => {
    if (bet.outcome === BetOutcome.WIN) return total + bet.payout;
    if (bet.outcome === BetOutcome.LOSS) return total - bet.placedBet.bet;
    return total;
  }, 0)
);

const placedAmount = (result: RollResult): number => (
  result.newBets.reduce((total, bet) => total + bet.bet, 0)
);

const outcomeForRoll = (result: RollResult): { label: string; tone: EventTone } => {
  const { initialState, resultingState, roll } = result;

  if (!initialState.pointIsOn) {
    if (resultingState.pointIsOn) return { label: `Point ${resultingState.point} set`, tone: 'neutral' };
    if (roll === 7 || roll === 11) return { label: 'Natural', tone: 'positive' };
    if (roll === 2 || roll === 3 || roll === 12) return { label: 'Craps', tone: 'negative' };
    return { label: 'Come out', tone: 'neutral' };
  }

  if (roll === initialState.point) return { label: `Point ${roll} hit`, tone: 'positive' };
  if (roll === 7) return { label: 'Seven out', tone: 'negative' };
  return { label: 'Point roll', tone: 'neutral' };
};

const bestStreak = (
  rows: SingleSessionLedgerRow[],
  predicate: (row: SingleSessionLedgerRow) => boolean,
  better: (current: Streak, best: Streak) => boolean
): Streak => {
  let best = emptyStreak();
  let current = emptyStreak();

  for (const row of rows) {
    if (predicate(row)) {
      current = current.count === 0
        ? { count: 1, sum: row.resolvedNet, startRoll: row.rollNumber, endRoll: row.rollNumber }
        : { ...current, count: current.count + 1, sum: current.sum + row.resolvedNet, endRoll: row.rollNumber };
    } else {
      if (better(current, best)) best = { ...current };
      current = emptyStreak();
    }
  }

  if (better(current, best)) best = { ...current };
  return best;
};

const valueOrDash = (value: number, predicate: (value: number) => boolean): number | string => (
  predicate(value) ? value : '--'
);

const rollLabel = (startRoll: number | null, endRoll: number | null = startRoll): string | null => {
  if (startRoll === null || endRoll === null) return null;
  return startRoll === endRoll ? `Roll ${startRoll}` : `Rolls ${startRoll}-${endRoll}`;
};

const keyEventsFor = (summary: SingleSessionSummary, rows: SingleSessionLedgerRow[]): SessionKeyEvent[] => {
  const biggestWin = rows.reduce((best, row) => row.resolvedNet > best.resolvedNet ? row : best, rows[0]);
  const biggestLoss = rows.reduce((best, row) => row.resolvedNet < best.resolvedNet ? row : best, rows[0]);
  const winStreak = bestStreak(
    rows,
    row => row.resolvedNet > 0,
    (current, best) => current.count > best.count || (current.count === best.count && current.sum > best.sum)
  );
  const lossStreak = bestStreak(
    rows,
    row => row.resolvedNet < 0,
    (current, best) => current.count > best.count || (current.count === best.count && current.sum < best.sum)
  );

  return [
    {
      id: 'biggest-win',
      label: 'Biggest single-roll win',
      value: valueOrDash(biggestWin.resolvedNet, value => value > 0),
      signed: true,
      rollLabel: biggestWin.resolvedNet > 0 ? rollLabel(biggestWin.rollNumber) : null,
      tone: 'positive',
      detail: 'Net profit from wagers settled on one roll.',
    },
    {
      id: 'biggest-loss',
      label: 'Biggest single-roll loss',
      value: valueOrDash(biggestLoss.resolvedNet, value => value < 0),
      signed: true,
      rollLabel: biggestLoss.resolvedNet < 0 ? rollLabel(biggestLoss.rollNumber) : null,
      tone: 'negative',
      detail: 'Net loss from wagers settled on one roll.',
    },
    {
      id: 'best-run',
      label: 'Best winning run',
      value: winStreak.count > 0 ? winStreak.sum : '--',
      signed: true,
      rollLabel: rollLabel(winStreak.startRoll, winStreak.endRoll),
      tone: 'positive',
      detail: winStreak.count > 0 ? `${winStreak.count} consecutive winning rolls` : 'No winning run.',
    },
    {
      id: 'worst-run',
      label: 'Worst losing run',
      value: lossStreak.count > 0 ? lossStreak.sum : '--',
      signed: true,
      rollLabel: rollLabel(lossStreak.startRoll, lossStreak.endRoll),
      tone: 'negative',
      detail: lossStreak.count > 0 ? `${lossStreak.count} consecutive losing rolls` : 'No losing run.',
    },
    {
      id: 'drawdown',
      label: 'Worst equity drawdown',
      value: summary.maxDrawdown,
      signed: false,
      rollLabel: rollLabel(summary.maxDrawdownRoll),
      tone: summary.maxDrawdown > 0 ? 'negative' : 'neutral',
      detail: 'Largest drop from the session equity peak.',
    },
    {
      id: 'exposure',
      label: 'Peak table exposure',
      value: summary.maxExposure,
      signed: false,
      rollLabel: rollLabel(summary.maxExposureRoll),
      tone: summary.maxExposure > 0 ? 'attention' : 'neutral',
      detail: 'Most money at risk when the dice were rolled.',
    },
  ];
};

export const analyzeSingleSession = (results: RollResult[]): SingleSessionAnalysis | null => {
  if (results.length === 0) return null;

  const initialBankroll = results[0].initialState.bankroll;
  let peakEquity = initialBankroll;
  let peakEquityRoll = 0;
  let maxDrawdown = 0;
  let maxDrawdownRoll: number | null = null;
  let maxExposure = 0;
  let maxExposureRoll: number | null = null;

  const ledgerRows = results.map((result): SingleSessionLedgerRow => {
    const rollNumber = result.initialState.rollNum + 1;
    const exposureBefore = exposure(result, 'before');
    const exposureAtRoll = exposure(result, 'atRoll');
    const exposureAfter = exposure(result, 'after');
    const equityBefore = equity(result.initialState.bankroll, exposureBefore);
    const equityAtRoll = equity(result.placedBetState.bankroll, exposureAtRoll);
    const equityAfter = equity(result.resultingState.bankroll, exposureAfter);
    const outcome = outcomeForRoll(result);

    if (equityAfter > peakEquity) {
      peakEquity = equityAfter;
      peakEquityRoll = rollNumber;
    }

    const drawdown = peakEquity - equityAfter;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownRoll = rollNumber;
    }

    if (exposureAtRoll > maxExposure) {
      maxExposure = exposureAtRoll;
      maxExposureRoll = rollNumber;
    }

    return {
      id: `roll-${rollNumber}`,
      eventKey: result.initialState.rollNum.toString(),
      result,
      rollNumber,
      dice: result.roll,
      outcomeLabel: outcome.label,
      outcomeTone: outcome.tone,
      pointBefore: result.initialState.pointIsOn ? result.initialState.point : null,
      pointAfter: result.resultingState.pointIsOn ? result.resultingState.point : null,
      cashBefore: result.initialState.bankroll,
      cashAfterPlacement: result.placedBetState.bankroll,
      cashAfter: result.resultingState.bankroll,
      exposureBefore,
      exposureAtRoll,
      exposureAfter,
      equityBefore,
      equityAtRoll,
      equityAfter,
      placedAmount: placedAmount(result),
      cashDelta: result.resultingState.bankroll - result.initialState.bankroll,
      resolvedNet: resolvedNet(result),
      equityDelta: equityAfter - equityBefore,
    };
  });

  const trend: SessionTrendPoint[] = [
    { roll: 0, cash: initialBankroll, equity: initialBankroll, exposure: 0 },
    ...ledgerRows.map(row => ({
      roll: row.rollNumber,
      cash: row.cashAfter,
      equity: row.equityAfter,
      exposure: row.exposureAfter,
    })),
  ];

  const lastRoll = ledgerRows[ledgerRows.length - 1];
  const finalResult = results[results.length - 1];
  const summary: SingleSessionSummary = {
    initialBankroll,
    finalCash: lastRoll.cashAfter,
    finalEquity: lastRoll.equityAfter,
    profit: lastRoll.equityAfter - initialBankroll,
    stopReason: finalResult.resultingState.limitReached(),
    totalRolls: lastRoll.rollNumber,
    peakEquity,
    peakEquityRoll,
    maxDrawdown,
    maxDrawdownRoll,
    maxExposure,
    maxExposureRoll,
  };

  return {
    summary,
    trend,
    keyEvents: keyEventsFor(summary, ledgerRows),
    ledgerRows,
  };
};
