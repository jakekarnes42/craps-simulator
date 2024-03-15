import { GameState, LimitReached } from '../../game/GameState';
import { TableSpeed, convertToTwoDecimalPlaceString, rollsToReadableDuration } from '../../util/Util';

type BulkResultDisplayProps = {
  results: Array<GameState>,
}

export const BulkResultDisplay = ({ results }: BulkResultDisplayProps) => {
  const totalCount = results.length;
  //Empty results
  if (totalCount === 0) {
    return (<></>);
  }


  const medianRollNum = median(results.map(result => result.rollNum));

  function convertToPercentageString(num: number) {
    return convertToTwoDecimalPlaceString(num * 100) + '%';
  }

  return (
    <div>
      <h3>Number of Simulated Sessions: {totalCount}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MAX}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.BANKROLL_MAX).length / totalCount))}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MIN}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.BANKROLL_MIN).length / totalCount))}</h3>
      <h3>Percentage of {LimitReached.BUSTED}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.BUSTED).length / totalCount))}</h3>
      <h3>Percentage of {LimitReached.MAX_ROLLS}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.MAX_ROLLS).length / totalCount))}</h3>
      <h3>Median number of rolls: {medianRollNum}
        <h5 className='mt-1'>
          <ul>
            <li>Slow table: Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Slow)}.</li>
            <li>Average table: Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Average)}.</li>
            <li>Fast table: Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Fast)}.</li>
          </ul>
        </h5></h3>
    </div>
  );


};

function median(numbers: Array<number>) {
  const sorted = numbers.sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}





