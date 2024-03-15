
import { RollResult } from '../../game/Session';
import { rollsToReadableDuration, TableSpeed } from '../../util/Util';
import { SingleGameRollDisplay } from './SingleGameRollDisplay';

type SingleGameResultDisplayProps = {
  results: Array<RollResult>,
}

export const SingleGameResultDisplay = ({ results }: SingleGameResultDisplayProps) => {

  //Empty results
  if (results.length === 0) {
    return (<></>);
  }

  const listItems = results.map((result) => <SingleGameRollDisplay key={result.initialState.rollNum} result={result} />
  );

  const lastRoll = results[results.length - 1];
  return (
    <div>
      <h3>Final Bankroll: ${lastRoll.resultingState.bankroll}</h3>
      <h3>Limit Reached:  {lastRoll.resultingState.limitReached()}</h3>
      <h3>Total Rolls: {lastRoll.resultingState.rollNum}
        <h5 className='mt-1'>
          <ul>
            <li>Slow table: Approx. {rollsToReadableDuration(lastRoll.resultingState.rollNum, TableSpeed.Slow)}.</li>
            <li>Average table: Approx. {rollsToReadableDuration(lastRoll.resultingState.rollNum, TableSpeed.Average)}.</li>
            <li>Fast table: Approx. {rollsToReadableDuration(lastRoll.resultingState.rollNum, TableSpeed.Fast)}.</li>
          </ul>
        </h5>
      </h3>
      <h3>Rolls:</h3>
      <div className="container">
        {listItems}
      </div>
    </div>
  );


};





