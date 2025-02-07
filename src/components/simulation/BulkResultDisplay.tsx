import { GameState, LimitReached } from '../../game/GameState';
import { computeHistogramData, computeSummaryStats, median } from '../../util/StatUtil';
import { TableSpeed, convertToTwoDecimalPlaceString, rollsToReadableDuration } from '../../util/Util';
import { Accordion } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type BulkResultDisplayProps = {
  results: Array<GameState>,
}

export const BulkResultDisplay = ({ results }: BulkResultDisplayProps) => {
  const totalCount = results.length;
  //Empty results
  if (totalCount === 0) {
    return (<></>);
  }

  //Stats
  const medianRollNum = median(results.map(result => result.rollNum));
  const finalBankrolls = results.map(r => r.bankroll);
  const stats = computeSummaryStats(finalBankrolls);

  // Create histogram data
  const histogramData = computeHistogramData(finalBankrolls, 10);

  // Helpers
  function convertToPercentageString(num: number) {
    return convertToTwoDecimalPlaceString(num * 100) + '%';
  }
  const bankrollMaxCount = results.filter(r => r.limitReached() === LimitReached.BANKROLL_MAX).length;
  const bankrollMinCount = results.filter(r => r.limitReached() === LimitReached.BANKROLL_MIN).length;
  const bustedCount = results.filter(r => r.limitReached() === LimitReached.BUSTED).length;
  const maxRollsCount = results.filter(r => r.limitReached() === LimitReached.MAX_ROLLS).length;


  return (
    <div>
      <h3>Number of Simulated Sessions: {totalCount}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MAX}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.BANKROLL_MAX).length / totalCount))}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MIN}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.BANKROLL_MIN).length / totalCount))}</h3>
      <h3>Percentage of {LimitReached.BUSTED}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.BUSTED).length / totalCount))}</h3>
      <h3>Percentage of {LimitReached.MAX_ROLLS}: {convertToPercentageString((results.filter(result => result.limitReached() === LimitReached.MAX_ROLLS).length / totalCount))}</h3>
      <h3>Median number of rolls: {medianRollNum}</h3>
      <h5 className='mt-1'>
        <ul>
          <li>Slow table: Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Slow)}.</li>
          <li>Average table: Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Average)}.</li>
          <li>Fast table: Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Fast)}.</li>
        </ul>
      </h5>
      <Accordion defaultActiveKey="0" className="mt-4">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Detailed Results (Final Bankroll)</Accordion.Header>
          <Accordion.Body>
            <ul>
              <li><strong>Mean (Average):</strong> {stats.mean.toFixed(2)}</li>
              <li><strong>Median:</strong> {stats.median.toFixed(2)}</li>
              <li><strong>Min:</strong> {stats.min.toFixed(2)}</li>
              <li><strong>Max:</strong> {stats.max.toFixed(2)}</li>
              <li><strong>Standard Deviation:</strong> {stats.standardDeviation.toFixed(2)}</li>
            </ul>

            <h5>Final Bankroll Distribution</h5>
            {histogramData.length === 0 ? (
              <p>No data for histogram.</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="binLabel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </div>

  );


};







