import React, { ReactNode } from 'react';
import { BetCollection, GameState } from '../../game/GameState';
import { BetOutcome, PlacedBet, ResolvedBet, RollResult } from '../../game/Session';
import { Badge } from 'react-bootstrap';

type SingleGameRollDisplayProps = {
  result: RollResult,
};

/**
 * Helper to color-code the outcome. 
 * You can adjust colors / text / badges as you wish.
 */
function renderOutcomeBadge(outcome: BetOutcome, payout: number): JSX.Element {
  switch (outcome) {
    case BetOutcome.WIN:
      return <Badge bg="success">Win (+${payout})</Badge>;
    case BetOutcome.LOSS:
      return <Badge bg="danger">Loss</Badge>;
    case BetOutcome.PUSH:
      return <Badge bg="secondary">Push (Returned ${payout})</Badge>;
  }
}

function representNewBets(newBets: PlacedBet[], newBankroll: number): ReactNode {
  if (newBets.length === 0) return <p className='mb-0'>No new bets placed.</p>;

  return (
    <>
      {newBets.map((newBet, index) => (
        <p className='mb-0' key={index}>
          <strong>New {newBet.type}:</strong> ${newBet.bet}
        </p>
      ))}
      <p className='mb-0'>
        <strong>Bankroll after placing bets:</strong> ${newBankroll}
      </p>
    </>
  );
}

function representResolvedBets(resolvedBets: ResolvedBet[]): ReactNode {
  if (resolvedBets.length === 0) {
    return <p className='mb-0'>No bets resolved this roll.</p>;
  }

  return (
    <>
      {resolvedBets.map((resolvedBet, index) => (
        <div key={index} className="mb-1">
          <strong>{resolvedBet.placedBet.type}</strong> &nbsp; 
          (${resolvedBet.placedBet.bet}) &nbsp; 
          {renderOutcomeBadge(resolvedBet.outcome, resolvedBet.payout)}
        </div>
      ))}
    </>
  );
}

function representBetCollection(currentBets: BetCollection): ReactNode {
  const {
    passLineBet,
    dontPassBet,
    comeBets,
    dontComeBets
  } = currentBets;

  const passLineDisplay = passLineBet ? (
    <li>
      <strong>Pass Line Bet:</strong> ${passLineBet.bet}
      {passLineBet.odds && (
        <span> &mdash; <em>Odds:</em> ${passLineBet.odds}</span>
      )}
    </li>
  ) : null;

  const dontPassDisplay = dontPassBet ? (
    <li>
      <strong>Don&apos;t Pass Bet:</strong> ${dontPassBet.bet}
      {dontPassBet.odds && (
        <span> &mdash; <em>Odds:</em> ${dontPassBet.odds}</span>
      )}
    </li>
  ) : null;

  const comeBetItems = comeBets.map((cb, i) => (
    <li key={i}>
      <strong>Come Bet:</strong> ${cb.bet}
      {cb.comePoint && <span> &mdash; <em>Come Point:</em> {cb.comePoint}</span>}
      {cb.odds && (
        <span> &mdash; <em>Odds:</em> ${cb.odds}</span>
      )}
    </li>
  ));

  const dontComeBetItems = dontComeBets.map((dcb, i) => (
    <li key={i}>
      <strong>Don&apos;t Come Bet:</strong> ${dcb.bet}
      {dcb.comePoint && <span> &mdash; <em>DC Point:</em> {dcb.comePoint}</span>}
      {dcb.odds && (
        <span> &mdash; <em>Odds:</em> ${dcb.odds}</span>
      )}
    </li>
  ));

  const hasBets = passLineBet || dontPassBet || comeBets.length || dontComeBets.length;

  return hasBets ? (
    <ul className='mb-0'>
      {passLineDisplay}
      {dontPassDisplay}
      {comeBetItems}
      {dontComeBetItems}
    </ul>
  ) : (
    <p className='mb-0'>No active bets.</p>
  );
}

function renderPoint(state: GameState): ReactNode {
  if (state.pointIsOn && state.point) {
    return (
      <p className='mb-0'>
        <strong>Point is on:</strong> {state.point}
      </p>
    );
  }
  return <p className='mb-0'><strong>Point is off.</strong></p>;
}

export const SingleGameRollDisplay = ({ result }: SingleGameRollDisplayProps) => {
  const {
    initialState,
    newBets,
    placedBetState,
    roll,
    resolvedBets,
    resultingState,
  } = result;

  return (
    <div className="row border mb-3 p-3">
      {/* Row Heading */}
      <div className="col-12 mb-2">
        <h5 className="m-0">
          Roll #{initialState.rollNum} &nbsp; 
          <small className="text-muted">Dice: {roll}</small>
        </h5>
      </div>

      {/* Column 1: Before the Roll */}
      <div className="col-md-2 mb-2">
        <h6 className="text-primary">Before the Roll</h6>
        <p className="mb-1">
          <strong>Bankroll:</strong> ${initialState.bankroll}
        </p>
        {renderPoint(initialState)}
      </div>

      {/* Column 2: Placing Bets */}
      <div className="col-md-3 mb-2">
        <h6 className="text-primary">Placing Bets</h6>
        {representNewBets(newBets, placedBetState.bankroll)}
      </div>

      {/* Column 3: All Current Bets */}
      <div className="col-md-4 mb-2">
        <h6 className="text-primary">All Current Bets</h6>
        {representBetCollection(placedBetState.currentBets)}
      </div>

      {/* Column 4: Roll Results */}
      <div className="col-md-3">
        <h6 className="text-primary">Roll Results</h6>
        <p className="mb-0">
          <strong>Dice Total:</strong> {roll}
        </p>
        {renderPoint(resultingState)}
        {representResolvedBets(resolvedBets)}
        <p className="mb-0">
          <strong>Bankroll after resolution:</strong> ${resultingState.bankroll}
        </p>
      </div>
    </div>
  );
};
