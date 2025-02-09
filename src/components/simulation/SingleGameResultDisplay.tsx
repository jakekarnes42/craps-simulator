import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip } from 'recharts';
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

  // Include a data point for the initial bankroll (roll 0) and then for each roll’s resulting bankroll.
  const bankrollHistoryChart = [
    {
      roll: results[0].initialState.rollNum + 1, // Plus one so it's one-indexed
      bankroll: results[0].initialState.bankroll
    },
    ...results.map(result => ({
      roll: result.resultingState.rollNum + 1, // Plus one so it's one-indexed
      bankroll: result.resultingState.bankroll
    }))
  ];

  // Create a custom tooltip that displays the roll number and bankroll.
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Each payload element contains the original data point in .payload.
      const dataPoint = payload[0].payload;
      return (
        <div
          className="custom-tooltip"
          style={{
            backgroundColor: '#fff',
            padding: '5px',
            border: '1px solid #ccc'
          }}
        >
          <p><strong>Roll:</strong> {dataPoint.roll}</p>
          <p><strong>Bankroll:</strong> ${dataPoint.bankroll}</p>
        </div>
      );
    }
    return null;
  };

  // Map each roll result to a display component.
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
      <div style={{ width: '100%', height: 300, margin: '20px 0' }}>
        <ResponsiveContainer>
          <LineChart data={bankrollHistoryChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="roll"
              label={{ value: 'Roll Number', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis label={{ value: 'Bankroll', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={CustomTooltip} />
            <Line type="monotone" dataKey="bankroll" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <h3>Rolls:</h3>
      <div className="container">
        {listItems}
      </div>
    </div>
  );


};





