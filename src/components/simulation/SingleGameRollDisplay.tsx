import { ReactNode } from 'react';
import { Badge, Accordion, Row, Col } from 'react-bootstrap';
import { BetCollection, GameState } from '../../game/GameState';
import { BetOutcome, BetType, PlacedBet, ResolvedBet, RollResult } from '../../game/Session';
import { PressStrategy, PressStrategyType } from '../../game/PressStrategy';
import { floorDownToProperUnit } from '../../util/Util';

type SingleGameRollDisplayProps = {
  result: RollResult,
  eventKey: string,
};

const renderOutcomeBadge = (outcome: BetOutcome, payout: number): JSX.Element => {
  switch (outcome) {
    case BetOutcome.WIN: return <Badge bg="success">Win (+${payout})</Badge>;
    case BetOutcome.LOSS: return <Badge bg="danger">Loss</Badge>;
    case BetOutcome.PUSH: return <Badge bg="secondary">Push (Returned ${payout})</Badge>;
  }
};

const getBetLabel = (placedBet: PlacedBet): string => {
  if (placedBet.type === BetType.NUMBER_BET) {
    return placedBet.number !== undefined ? `Number Bet (${placedBet.number})` : 'Number Bet';
  }
  return placedBet.type;
};

const representNewBets = (newBets: PlacedBet[], newBankroll: number): ReactNode => {
  if (newBets.length === 0) return <span className="text-muted small">No new bets placed.</span>;
  return (
    <ul className="mb-0 small ps-3">
      {newBets.map((newBet, index) => {
        const betLabel = newBet.type === BetType.NUMBER_BET && newBet.number !== undefined ? `New ${newBet.type} (${newBet.number})` : `New ${newBet.type}`;
        return <li key={index}><strong>{betLabel}:</strong> ${newBet.bet}</li>;
      })}
    </ul>
  );
};

const calculatePressDetails = (originalBet: number, payoff: number, betNumber: 4 | 5 | 6 | 8 | 9 | 10, pressStrategy: PressStrategy): { pressIncrease: number; bankrollReturn: number } => {
  const total = originalBet + payoff;
  switch (pressStrategy.type) {
    case PressStrategyType.NO_PRESS: return { pressIncrease: 0, bankrollReturn: payoff };
    case PressStrategyType.PRESS_UNTIL: {
      const target = pressStrategy.value;
      if (total <= target) return { pressIncrease: payoff, bankrollReturn: 0 };
      return { pressIncrease: target - originalBet, bankrollReturn: total - target };
    }
    case PressStrategyType.HALF_PRESS: {
      const half = payoff / 2;
      return { pressIncrease: half, bankrollReturn: payoff - half };
    }
    case PressStrategyType.FULL_PRESS: return { pressIncrease: payoff, bankrollReturn: 0 };
    case PressStrategyType.POWER_PRESS: {
      const maxPossible = originalBet + payoff;
      const finalPressed = floorDownToProperUnit(maxPossible, betNumber);
      return { pressIncrease: finalPressed - originalBet, bankrollReturn: maxPossible - finalPressed };
    }
    default: return { pressIncrease: 0, bankrollReturn: payoff };
  }
};

const calculateTableAction = (bets: BetCollection): number => {
  let sum = 0;
  if (bets.passLineBet) sum += bets.passLineBet.bet + (bets.passLineBet.odds || 0);
  if (bets.dontPassBet) sum += bets.dontPassBet.bet + (bets.dontPassBet.odds || 0);
  bets.comeBets.forEach(b => sum += b.bet + (b.odds || 0));
  bets.dontComeBets.forEach(b => sum += b.bet + (b.odds || 0));
  bets.numberBets.forEach(b => sum += b.bet);
  return sum;
}

export const SingleGameRollDisplay = ({ result, eventKey }: SingleGameRollDisplayProps) => {
  const { initialState, newBets, placedBetState, roll, resolvedBets, resultingState } = result;

  const rollOutcomeLabel = (() => {
    if (!initialState.pointIsOn) {
      if (resultingState.pointIsOn) return `Point Established (${resultingState.point})`;
      else if ([7, 11].includes(roll)) return 'Natural';
      else if ([2, 3, 12].includes(roll)) return 'Craps';
      return 'Come Out';
    }
    if (roll === initialState.point) return 'Point Hit';
    if (roll === 7) return 'Seven Out';
    return 'Point Roll';
  })();

  const numberBetsActive = placedBetState.pointIsOn;
  const cfg = initialState.configuration;

  const representBetCollection = (currentBets: BetCollection, numberBetsActive: boolean): ReactNode => {
    const { passLineBet, dontPassBet, comeBets, dontComeBets, numberBets } = currentBets;
    const passLineDisplay = passLineBet && (<li><strong>Pass Line Bet:</strong> ${passLineBet.bet}{passLineBet.odds && <span> &mdash; <em>Odds:</em> ${passLineBet.odds}</span>}</li>);
    const dontPassDisplay = dontPassBet && (<li><strong>Don't Pass Bet:</strong> ${dontPassBet.bet}{dontPassBet.odds && <span> &mdash; <em>Odds:</em> ${dontPassBet.odds}</span>}</li>);
    const comeBetItems = comeBets.map((cb, i) => (<li key={i}><strong>Come Bet:</strong> ${cb.bet}{cb.comePoint && <span> &mdash; <em>Point:</em> {cb.comePoint}</span>}{cb.odds && <span> &mdash; <em>Odds:</em> ${cb.odds}</span>}</li>));
    const dontComeBetItems = dontComeBets.map((dcb, i) => (<li key={i}><strong>Don't Come Bet:</strong> ${dcb.bet}{dcb.comePoint && <span> &mdash; <em>Point:</em> {dcb.comePoint}</span>}{dcb.odds && <span> &mdash; <em>Odds:</em> ${dcb.odds}</span>}</li>));
    const numberBetItems = numberBets.map((nb, i) => {
      const pressInfo = cfg.pressLimit !== null ? ` (Wins: ${nb.winCount} / ${cfg.pressLimit})` : ` (Wins: ${nb.winCount})`;
      return (<li key={i}><strong>Number Bet ({nb.number}){!numberBetsActive ? ' (Off)' : ''}:</strong> ${nb.bet}{pressInfo}</li>);
    });
    const hasBets = passLineBet || dontPassBet || comeBets.length || dontComeBets.length || numberBets.length;
    return hasBets ? (<ul className="mb-0 small ps-3">{passLineDisplay}{dontPassDisplay}{comeBetItems}{dontComeBetItems}{numberBetItems}</ul>) : (<span className="text-muted small">No active bets.</span>);
  };

  const representResolvedBets = (resolvedBets: ResolvedBet[]): ReactNode => {
    if (resolvedBets.length === 0) return <span className="text-muted small">No bets resolved.</span>;
    return (
      <ul className="mb-0 small ps-3">
        {resolvedBets.map((resolvedBet, index) => {
          const isCashedOut = resolvedBet.placedBet.type === BetType.NUMBER_BET && resolvedBet.placedBet.number !== undefined && resultingState.cashedOutNumbers.includes(resolvedBet.placedBet.number);
          return (
            <li key={index} className="mb-1">
              <strong>{getBetLabel(resolvedBet.placedBet)}</strong> (${resolvedBet.placedBet.bet}) {renderOutcomeBadge(resolvedBet.outcome, resolvedBet.payout)}
              {isCashedOut && <Badge bg="info" className="ms-1">Cashed Out</Badge>}
              {resolvedBet.placedBet.type === BetType.NUMBER_BET && resolvedBet.outcome === BetOutcome.WIN && resolvedBet.placedBet.number !== undefined && !isCashedOut && cfg.pressStrategy.type !== PressStrategyType.NO_PRESS && (
                  <span className="ms-2 text-primary d-block">
                    ↳ {(() => {
                      const { pressIncrease, bankrollReturn } = calculatePressDetails(resolvedBet.placedBet.bet, resolvedBet.payout, resolvedBet.placedBet.number, cfg.pressStrategy);
                      return `Pressed: $${pressIncrease.toFixed(2)}, Returned: $${bankrollReturn.toFixed(2)}`;
                    })()}
                  </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  // Compute Header Summaries
  let totalWin = 0;
  let totalLoss = 0;
  resolvedBets.forEach(b => {
    if (b.outcome === BetOutcome.WIN) totalWin += b.payout;
    if (b.outcome === BetOutcome.LOSS) totalLoss += b.placedBet.bet;
  });
  let totalPlaced = newBets.reduce((sum, b) => sum + b.bet, 0);
  const activeTableAction = calculateTableAction(placedBetState.currentBets);

  const netChange = totalWin - totalLoss - totalPlaced;
  const isPositive = netChange > 0;
  const isNegative = netChange < 0;

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>
        <Row className="w-100 align-items-center m-0 text-center text-md-start" style={{ fontSize: '0.9rem' }}>
          <Col xs={3} md={1} className="text-start"><strong>#{initialState.rollNum + 1}</strong></Col>
          <Col xs={3} md={1} style={{ fontSize: '1.2rem' }}>🎲 <strong>{roll}</strong></Col>
          <Col xs={6} md={3} className="text-end text-md-start">
            <Badge bg={roll === 7 ? 'danger' : 'secondary'} className="px-2 py-1">{rollOutcomeLabel}</Badge>
          </Col>
          <Col xs={0} md={3} className="d-none d-md-block text-muted">
            On Table: ${activeTableAction}
          </Col>
          <Col xs={6} md={2} className={`text-start mt-2 mt-md-0 ${isPositive ? 'text-success fw-bold' : (isNegative ? 'text-danger' : 'text-muted')}`}>
            {isPositive ? '+' : ''}{isNegative ? '-' : ''}${Math.abs(netChange).toFixed(2)}
          </Col>
          <Col xs={6} md={2} className="text-end mt-2 mt-md-0 fw-bold">
            ${resultingState.bankroll.toFixed(2)}
          </Col>
        </Row>
      </Accordion.Header>
      <Accordion.Body className="bg-body-tertiary p-3">
        <Row className="g-3">
          <Col md={3}>
             <h6 className="text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Before Roll</h6>
             <div className="small"><strong>Bankroll:</strong> ${initialState.bankroll.toFixed(2)}</div>
             <div className="small"><strong>Point:</strong> {initialState.pointIsOn ? initialState.point : 'Off'}</div>
          </Col>
          <Col md={3}>
             <h6 className="text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Action Taken</h6>
             {representNewBets(newBets, placedBetState.bankroll)}
             <div className="small mt-2 text-muted"><strong>Balance:</strong> ${placedBetState.bankroll.toFixed(2)}</div>
          </Col>
          <Col md={3}>
             <h6 className="text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Active Wagers</h6>
             {representBetCollection(placedBetState.currentBets, numberBetsActive)}
          </Col>
          <Col md={3}>
             <h6 className="text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Resolution</h6>
             {representResolvedBets(resolvedBets)}
          </Col>
        </Row>
      </Accordion.Body>
    </Accordion.Item>
  );
};
