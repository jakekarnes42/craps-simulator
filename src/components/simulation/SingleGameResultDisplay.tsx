import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  Tooltip,
} from 'recharts';
import { RollResult } from '../../game/Session';
import {
  rollsToReadableDuration,
  TableSpeed,
  convertToTwoDecimalPlaceString,
} from '../../util/Util';
import { SingleGameRollDisplay } from './SingleGameRollDisplay';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Props for the SingleGameResultDisplay component.
 */
interface SingleGameResultDisplayProps {
  results: RollResult[];
}

/**
 * Represents the net change in bankroll for a given roll.
 */
interface RollNetChange {
  roll: number;
  net: number;
}

/**
 * Represents a streak (winning or losing) over consecutive rolls.
 */
interface Streak {
  count: number;
  sum: number;
  startRoll: number | null;
  endRoll: number | null;
}

/**
 * Computes the best streak (winning or losing) from an array of roll net changes.
 *
 * @param rolls - Array of net changes for each roll.
 * @param predicate - A function to test if a roll qualifies for the streak (e.g. net > 0 for wins).
 * @param compareStreak - A comparator function that returns true if the current streak is better than the best so far.
 * @returns The best streak that satisfies the predicate.
 */
const computeBestStreak = (
  rolls: RollNetChange[],
  predicate: (net: number) => boolean,
  compareStreak: (current: Streak, best: Streak) => boolean
): Streak => {
  let best: Streak = { count: 0, sum: 0, startRoll: null, endRoll: null };
  let current: Streak = { count: 0, sum: 0, startRoll: null, endRoll: null };

  rolls.forEach((entry) => {
    if (predicate(entry.net)) {
      // If starting a new streak, set start/end to this roll.
      if (current.count === 0) {
        current = { count: 1, sum: entry.net, startRoll: entry.roll, endRoll: entry.roll };
      } else {
        current.count += 1;
        current.sum += entry.net;
        current.endRoll = entry.roll;
      }
    } else {
      if (compareStreak(current, best)) {
        best = { ...current };
      }
      current = { count: 0, sum: 0, startRoll: null, endRoll: null };
    }
  });

  // Check final streak in case it continues until the last roll.
  if (compareStreak(current, best)) {
    best = { ...current };
  }

  return best;
};

/**
 * SingleGameResultDisplay displays the results of a single simulation.
 * It shows a bankroll evolution chart along with additional statistics such as:
 * - Biggest single win and loss (by roll)
 * - Longest winning and losing streaks (with total win/loss amounts)
 * - Maximum and minimum bankroll achieved (with the roll at which they occurred)
 *
 * @param results - An array of RollResult objects from the simulation.
 */
export const SingleGameResultDisplay: React.FC<SingleGameResultDisplayProps> = ({ results }) => {
  const { theme } = useTheme();

  // If there are no results, render nothing.
  if (results.length === 0) {
    return null;
  }

  // Build the bankroll history data for the chart.
  // We include the initial state and then each resulting state.
  const bankrollHistoryChart = [
    {
      roll: results[0].initialState.rollNum + 1, // Convert to one-indexed roll number
      bankroll: results[0].initialState.bankroll,
    },
    ...results.map((result) => ({
      roll: result.resultingState.rollNum + 1,
      bankroll: result.resultingState.bankroll,
    })),
  ];

  // Compute the net change in bankroll for each roll.
  const rollNetChanges: RollNetChange[] = results.map((result) => ({
    roll: result.initialState.rollNum + 1,
    net: result.resultingState.bankroll - result.initialState.bankroll,
  }));

  // Find the roll with the largest positive net change (biggest win).
  const biggestWinEntry = rollNetChanges.reduce((max, current) =>
    current.net > max.net ? current : max, rollNetChanges[0]);

  // Find the roll with the largest negative net change (biggest loss).
  const biggestLossEntry = rollNetChanges.reduce((min, current) =>
    current.net < min.net ? current : min, rollNetChanges[0]);

  // Compute the longest winning streak.
  const bestWinStreak = computeBestStreak(
    rollNetChanges,
    (net) => net > 0,
    (current, best) =>
      current.count > best.count || (current.count === best.count && current.sum > best.sum)
  );

  // Compute the longest losing streak.
  const bestLossStreak = computeBestStreak(
    rollNetChanges,
    (net) => net < 0,
    (current, best) =>
      current.count > best.count || (current.count === best.count && current.sum < best.sum)
  );

  // Compute the overall maximum and minimum bankroll values from the chart.
  const maxBankrollEntry = bankrollHistoryChart.reduce((max, current) =>
    current.bankroll > max.bankroll ? current : max, bankrollHistoryChart[0]);
  const minBankrollEntry = bankrollHistoryChart.reduce((min, current) =>
    current.bankroll < min.bankroll ? current : min, bankrollHistoryChart[0]);

  const isDark = theme === 'dark';
  const axisColor = isDark ? "#888" : "#ccc";
  const textColor = isDark ? "#fff" : "#000";
  const lineColor = isDark ? "#4a90e2" : "#8884d8";
  const tooltipCursorFill = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  /**
   * Custom tooltip for the bankroll evolution chart.
   */
  const CustomTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div
          className="custom-tooltip"
          style={{
            backgroundColor: isDark ? '#333' : '#fff',
            color: textColor,
            padding: '5px',
            border: isDark ? "1px solid #555" : "1px solid #ccc",
          }}
        >
          <p>
            <strong>Roll:</strong> {dataPoint.roll}
          </p>
          <p>
            <strong>Bankroll:</strong> ${dataPoint.bankroll}
          </p>
        </div>
      );
    }
    return null;
  };

  // Render each roll's details.
  const listItems = results.map((result) => (
    <SingleGameRollDisplay key={result.initialState.rollNum} result={result} />
  ));

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


      {/* Additional Simulation Stats */}
      <div
        style={{
          margin: '1rem 0',
          padding: '0.5rem',
          border: '1px solid #ccc',
          borderRadius: '5px',
        }}
      >
        <h4>Additional Simulation Stats</h4>
        <ul>
          <li>
            <strong>Biggest Single Win:</strong>{' '}
            {biggestWinEntry.net > 0
              ? `$${convertToTwoDecimalPlaceString(biggestWinEntry.net)} on Roll #${biggestWinEntry.roll}`
              : 'No winning roll'}
          </li>
          <li>
            <strong>Biggest Single Loss:</strong>{' '}
            {biggestLossEntry.net < 0
              ? `-$${convertToTwoDecimalPlaceString(Math.abs(biggestLossEntry.net))} on Roll #${biggestLossEntry.roll}`
              : 'No losing roll'}
          </li>
          <li>
            <strong>Longest Winning Streak:</strong>{' '}
            {bestWinStreak.count > 0
              ? `${bestWinStreak.count} consecutive winning roll${bestWinStreak.count > 1 ? 's' : ''
              } (Roll #${bestWinStreak.startRoll} to #${bestWinStreak.endRoll}) with a total win of $${convertToTwoDecimalPlaceString(bestWinStreak.sum)}`
              : 'None'}
          </li>
          <li>
            <strong>Longest Losing Streak:</strong>{' '}
            {bestLossStreak.count > 0
              ? `${bestLossStreak.count} consecutive losing roll${bestLossStreak.count > 1 ? 's' : ''
              } (Roll #${bestLossStreak.startRoll} to #${bestLossStreak.endRoll}) with a total loss of -$${convertToTwoDecimalPlaceString(
                Math.abs(bestLossStreak.sum)
              )}`
              : 'None'}
          </li>
          <li>
            <strong>Maximum Bankroll Achieved:</strong>{' '}
            {`$${convertToTwoDecimalPlaceString(maxBankrollEntry.bankroll)} on Roll #${maxBankrollEntry.roll}`}
          </li>
          <li>
            <strong>Minimum Bankroll Achieved:</strong>{' '}
            {`$${convertToTwoDecimalPlaceString(minBankrollEntry.bankroll)} on Roll #${minBankrollEntry.roll}`}
          </li>
        </ul>
      </div>

      {/* Bankroll Evolution Chart */}
      <div style={{ width: '100%', height: 300, margin: '20px 0' }}>
        <ResponsiveContainer>
          <LineChart data={bankrollHistoryChart}>
            <CartesianGrid strokeDasharray="3 3" stroke={axisColor} />
            <XAxis
              dataKey="roll"
              label={{ value: 'Roll Number', position: 'insideBottomRight', offset: -5 }}
              stroke={textColor}
            />
            <YAxis label={{ value: 'Bankroll', angle: -90, position: 'insideLeft' }} stroke={textColor} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: tooltipCursorFill }} />
            <Line type="monotone" dataKey="bankroll" stroke={lineColor} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3>Roll Details:</h3>
      <div className="container">{listItems}</div>
    </div>
  );
};
