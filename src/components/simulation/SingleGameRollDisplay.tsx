import { ReactNode } from 'react';
import { Badge } from 'react-bootstrap';
import { BetCollection, GameState } from '../../game/GameState';
import { BetOutcome, BetType, PlacedBet, ResolvedBet, RollResult } from '../../game/Session';

type SingleGameRollDisplayProps = {
  result: RollResult,
};

const renderOutcomeBadge = (outcome: BetOutcome, payout: number): JSX.Element => {
  switch (outcome) {
    case BetOutcome.WIN:
      return <Badge bg="success">Win (+${payout})</Badge>;
    case BetOutcome.LOSS:
      return <Badge bg="danger">Loss</Badge>;
    case BetOutcome.PUSH:
      return <Badge bg="secondary">Push (Returned ${payout})</Badge>;
  }
};

const getBetLabel = (placedBet: PlacedBet): string => {
  if (placedBet.type === BetType.NUMBER_BET) {
    return placedBet.number !== undefined
      ? `Number Bet (${placedBet.number})`
      : 'Number Bet';
  }
  return placedBet.type;
};

const representNewBets = (newBets: PlacedBet[], newBankroll: number): ReactNode => {
  if (newBets.length === 0) {
    return <p className="mb-0">No new bets placed.</p>;
  }
  return (
    <>
      {newBets.map((newBet, index) => {
        const betLabel =
          newBet.type === 'Number Bet' && newBet.number !== undefined
            ? `New ${newBet.type} (${newBet.number})`
            : `New ${newBet.type}`;
        return (
          <p className="mb-0" key={index}>
            <strong>{betLabel}:</strong> ${newBet.bet}
          </p>
        );
      })}
      <p className="mb-0">
        <strong>Bankroll after placing bets:</strong> ${newBankroll}
      </p>
    </>
  );
};

const representResolvedBets = (resolvedBets: ResolvedBet[]): ReactNode => {
  if (resolvedBets.length === 0) {
    return <p className="mb-0">No bets resolved this roll.</p>;
  }
  return (
    <>
      {resolvedBets.map((resolvedBet, index) => (
        <div key={index} className="mb-1">
          <strong>{getBetLabel(resolvedBet.placedBet)}</strong> &nbsp;
          (${resolvedBet.placedBet.bet}) &nbsp;
          {renderOutcomeBadge(resolvedBet.outcome, resolvedBet.payout)}
        </div>
      ))}
    </>
  );
};

const representBetCollection = (currentBets: BetCollection, numberBetsActive: boolean): ReactNode => {
  const { passLineBet, dontPassBet, comeBets, dontComeBets, numberBets } = currentBets;

  const passLineDisplay = passLineBet && (
    <li>
      <strong>Pass Line Bet:</strong> ${passLineBet.bet}
      {passLineBet.odds && <span> &mdash; <em>Odds:</em> ${passLineBet.odds}</span>}
    </li>
  );

  const dontPassDisplay = dontPassBet && (
    <li>
      <strong>Don&apos;t Pass Bet:</strong> ${dontPassBet.bet}
      {dontPassBet.odds && <span> &mdash; <em>Odds:</em> ${dontPassBet.odds}</span>}
    </li>
  );

  const comeBetItems = comeBets.map((cb, i) => (
    <li key={i}>
      <strong>Come Bet:</strong> ${cb.bet}
      {cb.comePoint && <span> &mdash; <em>Come Point:</em> {cb.comePoint}</span>}
      {cb.odds && <span> &mdash; <em>Odds:</em> ${cb.odds}</span>}
    </li>
  ));

  const dontComeBetItems = dontComeBets.map((dcb, i) => (
    <li key={i}>
      <strong>Don&apos;t Come Bet:</strong> ${dcb.bet}
      {dcb.comePoint && <span> &mdash; <em>DC Point:</em> {dcb.comePoint}</span>}
      {dcb.odds && <span> &mdash; <em>Odds:</em> ${dcb.odds}</span>}
    </li>
  ));

  const numberBetItems = numberBets.map((nb, i) => (
    <li key={i}>
      <strong>Number Bet ({nb.number}){!numberBetsActive ? ' (Off)' : ''}:</strong> ${nb.wager}
    </li>
  ));

  const hasBets =
    passLineBet || dontPassBet || comeBets.length || dontComeBets.length || numberBets.length;

  return hasBets ? (
    <ul className="mb-0">
      {passLineDisplay}
      {dontPassDisplay}
      {comeBetItems}
      {dontComeBetItems}
      {numberBetItems}
    </ul>
  ) : (
    <p className="mb-0">No active bets.</p>
  );
};

const renderPoint = (state: GameState): ReactNode =>
  state.pointIsOn && state.point ? (
    <p className="mb-0">
      <strong>Point is on:</strong> {state.point}
    </p>
  ) : (
    <p className="mb-0"><strong>Point is off.</strong></p>
  );

/**
 * Computes a descriptive label for the roll outcome.
 * - For a come‑out roll:
 *   - "Point Established" if a point is set in the resulting state.
 *   - "Natural" for a 7 or 11.
 *   - "Craps" for a 2, 3, or 12.
 * - For a point roll:
 *   - "Point Hit" if the roll equals the point.
 *   - "Seven Out" if the roll is 7.
 *   - "Point Roll" otherwise.
 */
const getRollOutcomeLabel = (
  initialState: GameState,
  resultingState: GameState,
  roll: number
): string => {
  if (!initialState.pointIsOn) {
    if (resultingState.pointIsOn) {
      return `Come Out Roll – Point Established (${resultingState.point})`;
    } else if ([7, 11].includes(roll)) {
      return 'Come Out Roll – Natural';
    } else if ([2, 3, 12].includes(roll)) {
      return 'Come Out Roll – Craps';
    }
    return 'Come Out Roll';
  }
  if (roll === initialState.point) {
    return 'Point Hit';
  }
  if (roll === 7) {
    return 'Seven Out';
  }
  return 'Point Roll';
};

export const SingleGameRollDisplay = ({ result }: SingleGameRollDisplayProps) => {
  const { initialState, newBets, placedBetState, roll, resolvedBets, resultingState } = result;
  const rollOutcomeLabel = getRollOutcomeLabel(initialState, resultingState, roll);

  // Determine if number bets are active during this particular roll.
  const numberBetsActive =
    placedBetState.pointIsOn || placedBetState.configuration.leaveNumberBetsWorkingDuringComeOut;

  return (
    <div className="row border mb-3 p-3">
      {/* Row Heading */}
      <div className="col-12 mb-2">
        <h5 className="m-0">
          Roll #{initialState.rollNum} &nbsp;
          <small className="text-muted">
            ({rollOutcomeLabel}) – Dice Total: {roll}
          </small>
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
        {representBetCollection(placedBetState.currentBets, numberBetsActive)}
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
