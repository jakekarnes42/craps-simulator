import { ReactNode } from 'react';
import { Accordion, Badge } from 'react-bootstrap';
import { BetCollection } from '../../../engine/GameState';
import { applyNumberBetPress, CrapsNumber } from '../../../engine/NumberBets';
import { BetOutcome, BetType, PlacedBet, ResolvedBet } from '../../../engine/Session';
import { PressStrategy, PressStrategyType } from '../../../engine/Strategies';
import { formatMoney, formatSignedMoney, moneyTone } from '../../../shared/format';
import { SingleSessionLedgerRow } from './analyzeSingleSession';

type RollDetailsProps = {
  row: SingleSessionLedgerRow;
  eventKey: string;
};

const noPress: PressStrategy = { type: PressStrategyType.NO_PRESS };

const badgeVariant = (tone: string): string => {
  if (tone === 'positive') return 'success';
  if (tone === 'negative') return 'danger';
  if (tone === 'attention') return 'warning';
  return 'secondary';
};

const renderOutcomeBadge = (outcome: BetOutcome): JSX.Element => {
  switch (outcome) {
    case BetOutcome.WIN:
      return <Badge bg="success">Won</Badge>;
    case BetOutcome.LOSS:
      return <Badge bg="danger">Lost</Badge>;
    case BetOutcome.PUSH:
      return <Badge bg="secondary">Push</Badge>;
  }
};

const getBetLabel = (placedBet: PlacedBet): string => {
  if (placedBet.type === BetType.NUMBER_BET) {
    return placedBet.number !== undefined ? `Number ${placedBet.number}` : 'Number Bet';
  }
  return placedBet.type;
};

const pointLabel = (point: number | null): string => point?.toString() ?? 'Off';

const renderNewBets = (newBets: PlacedBet[]): ReactNode => {
  if (newBets.length === 0) return <span className="muted-detail">No new bets placed.</span>;

  return (
    <ul className="compact-list">
      {newBets.map((newBet, index) => (
        <li key={index}>
          <strong>{getBetLabel(newBet)}:</strong> {formatMoney(newBet.bet)}
        </li>
      ))}
    </ul>
  );
};

const renderBetCollection = (currentBets: BetCollection, numbersWorking: boolean): ReactNode => {
  const { passLineBet, dontPassBet, comeBets, dontComeBets, numberBets } = currentBets;
  const hasBets = passLineBet || dontPassBet || comeBets.length || dontComeBets.length || numberBets.length;

  if (!hasBets) return <span className="muted-detail">No active wagers.</span>;

  return (
    <ul className="compact-list">
      {passLineBet && (
        <li>
          <strong>Pass Line:</strong> {formatMoney(passLineBet.bet)}
          {passLineBet.odds !== null && <span>; odds {formatMoney(passLineBet.odds)}</span>}
        </li>
      )}
      {dontPassBet && (
        <li>
          <strong>Don't Pass:</strong> {formatMoney(dontPassBet.bet)}
          {dontPassBet.odds !== null && <span>; odds {formatMoney(dontPassBet.odds)}</span>}
        </li>
      )}
      {comeBets.map((bet, index) => (
        <li key={`come-${index}`}>
          <strong>Come:</strong> {formatMoney(bet.bet)}
          {bet.comePoint !== null && <span>; point {bet.comePoint}</span>}
          {bet.odds !== null && <span>; odds {formatMoney(bet.odds)}</span>}
        </li>
      ))}
      {dontComeBets.map((bet, index) => (
        <li key={`dont-come-${index}`}>
          <strong>Don't Come:</strong> {formatMoney(bet.bet)}
          {bet.comePoint !== null && <span>; point {bet.comePoint}</span>}
          {bet.odds !== null && <span>; odds {formatMoney(bet.odds)}</span>}
        </li>
      ))}
      {numberBets.map((bet) => (
        <li key={`number-${bet.number}`}>
          <strong>Number {bet.number}{numbersWorking ? '' : ' off'}:</strong> {formatMoney(bet.bet)}
          <span>; wins {bet.winCount}</span>
        </li>
      ))}
    </ul>
  );
};

const renderResolvedBets = (row: SingleSessionLedgerRow, bets: ResolvedBet[]): ReactNode => {
  const { placedBetState, resultingState } = row.result;
  const cfg = row.result.initialState.configuration;

  if (bets.length === 0) return <span className="muted-detail">No wagers settled.</span>;

  return (
    <ul className="compact-list">
      {bets.map((resolvedBet, index) => {
        const number = resolvedBet.placedBet.number;
        const isNumberBet = resolvedBet.placedBet.type === BetType.NUMBER_BET && number !== undefined;
        const isCashedOut = isNumberBet && resultingState.cashedOutNumbers.includes(number);
        const pressStrategy = isNumberBet
          ? placedBetState.currentBets.numberBets.find((bet) => bet.number === number)?.pressStrategy ?? noPress
          : noPress;

        return (
          <li key={index}>
            <strong>{getBetLabel(resolvedBet.placedBet)}</strong> ({formatMoney(resolvedBet.placedBet.bet)}) {renderOutcomeBadge(resolvedBet.outcome)}
            {isCashedOut && <Badge bg="info" className="ms-1">Cashed Out</Badge>}
            {isNumberBet && resolvedBet.outcome === BetOutcome.WIN && !isCashedOut && pressStrategy.type !== PressStrategyType.NO_PRESS && (
              <span className="roll-press-detail">
                {(() => {
                  const { pressIncrease, netToBankroll } = applyNumberBetPress(
                    cfg.avoidRounding,
                    resolvedBet.placedBet.bet,
                    resolvedBet.payout,
                    number as CrapsNumber,
                    pressStrategy
                  );
                  return `Pressed ${formatMoney(pressIncrease)}, returned ${formatMoney(netToBankroll)}`;
                })()}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export const RollDetails = ({ row, eventKey }: RollDetailsProps) => {
  const { result } = row;
  const numberBetsActive = result.placedBetState.pointIsOn || result.initialState.configuration.leaveNumberBetsWorkingDuringComeOut;

  return (
    <Accordion.Item eventKey={eventKey} className="single-ledger-item">
      <Accordion.Header>
        <div className="single-ledger-row-summary">
          <div className="ledger-roll-cell">
            <span>#{row.rollNumber}</span>
            <strong>{row.dice}</strong>
          </div>
          <div className="ledger-outcome-cell">
            <Badge bg={badgeVariant(row.outcomeTone)}>{row.outcomeLabel}</Badge>
            <small>Point {pointLabel(row.pointBefore)} {'->'} {pointLabel(row.pointAfter)}</small>
          </div>
          <div className="ledger-money-cell">
            <span>Placed</span>
            <strong>{formatMoney(row.placedAmount)}</strong>
          </div>
          <div className={`ledger-money-cell ${moneyTone(row.resolvedNet)}`}>
            <span>Wager P/L</span>
            <strong>{formatSignedMoney(row.resolvedNet)}</strong>
          </div>
          <div className={`ledger-money-cell ${moneyTone(row.equityDelta)}`}>
            <span>Equity Change</span>
            <strong>{formatSignedMoney(row.equityDelta)}</strong>
          </div>
          <div className="ledger-money-cell">
            <span>Cash / Equity</span>
            <strong>{formatMoney(row.cashAfter)} / {formatMoney(row.equityAfter)}</strong>
          </div>
        </div>
      </Accordion.Header>
      <Accordion.Body>
        <div className="single-roll-detail-grid">
          <section className="roll-state-section">
            <h3>State</h3>
            <div className="roll-state-table">
              <span />
              <strong>Before</strong>
              <strong>After</strong>
              <span>Cash</span>
              <span>{formatMoney(row.cashBefore)}</span>
              <span>{formatMoney(row.cashAfter)}</span>
              <span>On Table</span>
              <span>{formatMoney(row.exposureBefore)}</span>
              <span>{formatMoney(row.exposureAfter)}</span>
              <span>Equity</span>
              <span>{formatMoney(row.equityBefore)}</span>
              <span>{formatMoney(row.equityAfter)}</span>
              <span>Point</span>
              <span>{pointLabel(row.pointBefore)}</span>
              <span>{pointLabel(row.pointAfter)}</span>
            </div>
          </section>
          <section>
            <h3>Bets Placed</h3>
            {renderNewBets(result.newBets)}
            <div className="roll-detail-facts">
              <div><span>Cash After Bets</span><strong>{formatMoney(row.cashAfterPlacement)}</strong></div>
              <div><span>On Table</span><strong>{formatMoney(row.exposureAtRoll)}</strong></div>
            </div>
          </section>
          <section>
            <h3>Active Wagers</h3>
            {renderBetCollection(result.placedBetState.currentBets, numberBetsActive)}
          </section>
          <section>
            <h3>Bet Results</h3>
            {renderResolvedBets(row, result.resolvedBets)}
            <div className="roll-detail-facts">
              <div>
                <span>Wager P/L</span>
                <strong className={moneyTone(row.resolvedNet)}>{formatSignedMoney(row.resolvedNet)}</strong>
              </div>
            </div>
          </section>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};
