
import { ReactNode } from 'react';
import { BetOutcome, PlacedBet, ResolvedBet, RollResult } from '../../game/Session';
import { BetCollection, GameState } from '../../game/GameState';

type SingleGameRollDisplayProps = {
  result: RollResult,
}

function representNewBets(newBets: PlacedBet[], newBankroll: number): ReactNode {
  if (newBets.length > 0) {
    const listItems = newBets.map((newBet) =>
      <li className='mb-0' key={newBet.type}>New {newBet.type}: ${newBet.bet}</li>
    );

    return <div>
      <p className='mb-0'>New Bets: </p>
      <ul className='mb-0'>{listItems}</ul>
      <p className='mb-0'>Bankroll after placing bets: ${newBankroll}</p>
    </div>;
  } else {
    return <></>;
  }
}

function representResolvedBets(resolvedBets: ResolvedBet[]): ReactNode {
  if (resolvedBets.length > 0) {
    const listItems = resolvedBets.map((resolvedBet) =>
      <li key={resolvedBet.placedBet.type}>{resolvedBet.placedBet.type}: Initial Bet ${resolvedBet.placedBet.bet}. Result: {resolvedBet.outcome === BetOutcome.WIN ? <span>Win. Payout ${resolvedBet.payout}</span> : resolvedBet.outcome === BetOutcome.LOSS ? "Loss" : <span>Push. Returned ${resolvedBet.payout}</span>}.</li>
    );

    return <div>
      <p className='mb-0'>Resolved Bets: </p>
      <ul className='mb-0'>{listItems}</ul>
    </div>;
  } else {
    return <></>;
  }
}

function representBetCollection(currentBets: BetCollection): ReactNode {

  const passLineBetDisplay = currentBets.passLineBet ? <li>Pass Line Bet: ${currentBets.passLineBet.bet} {currentBets.passLineBet.odds ? <span> with odds: ${currentBets.passLineBet.odds}</span> : <></>}</li> : <></>;
  const dontPassBetDisplay = currentBets.dontPassBet ? <li>Don't Pass Bet: ${currentBets.dontPassBet.bet} {currentBets.dontPassBet.odds ? <span> with odds: ${currentBets.dontPassBet.odds}</span> : <></>}</li> : <></>;
  const comeBetsDisplay = currentBets.comeBets.length > 0 ? currentBets.comeBets.map(comeBet => <li>Come Bet: ${comeBet.bet}. Come Point: {comeBet.comePoint ? comeBet.comePoint : "Not Set"}. {comeBet.odds ? <span> With odds: ${comeBet.odds}</span> : <></>}</li>) : <></>;
  const dontBetsDisplay = currentBets.dontComeBets.length > 0 ? currentBets.dontComeBets.map(dontComeBet => <li>Don't Come Bet: ${dontComeBet.bet}. Don't Come Point: {dontComeBet.comePoint ? dontComeBet.comePoint : "Not Set"}. {dontComeBet.odds ? <span> With odds: ${dontComeBet.odds}</span> : <></>}</li>) : <></>;
  return (
    <div>
      <p className='mb-0'>All Current Bets: </p>
      <ul className='mb-0'>
        {passLineBetDisplay}
        {dontPassBetDisplay}
        {comeBetsDisplay}
        {dontBetsDisplay}
      </ul>
    </div>);

}

export const SingleGameRollDisplay = ({ result }: SingleGameRollDisplayProps) => {

  return (
    <div className="row border mb-2">
      <h5 className='mt-1'>Roll: {result.initialState.rollNum}</h5>
      <div className="col-sm border-top border-end">
        <h6 className='mt-1'>Before the Roll: </h6>
        <p className='mb-0'>Bankroll before bets: ${result.initialState.bankroll}</p>
        {renderPoint(result.initialState)}
      </div>
      <div className="col-sm border-top border-start border-end">
        <h6 className='mt-1'>Placing Bets:</h6>
        {representNewBets(result.newBets, result.placedBetState.bankroll)}
        {representBetCollection(result.placedBetState.currentBets)}
      </div>
      <div className="col-sm border-top border-start ">
        <h6 className='mt-1'>The Roll: {result.roll}</h6>
        {renderPoint(result.resultingState)}
        {representResolvedBets(result.resolvedBets)}
        <p className='mb-0'>Bankroll after placing bets: ${result.resultingState.bankroll}</p>
      </div>
    </div>
  );


};





function renderPoint(state: GameState): ReactNode {
  if (state.point) {
    return (<div >
      <p className='mb-0'>The Point is On.</p>
      <p className='mb-0'>The Point is set to {state.point}.</p>
    </div>);
  } else {
    return (<div>
      <p className='mb-0'>The Point is Off.</p>
    </div>);
  }

}

