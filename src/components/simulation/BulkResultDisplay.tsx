import React from 'react';
import { Accordion } from 'react-bootstrap';
import { GameState, LimitReached } from '../../game/GameState';
import { useTheme } from '../../theme/ThemeContext';
import { TableSpeed, convertToTwoDecimalPlaceString, rollsToReadableDuration } from '../../util/Util';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

/**
 * Props for the BulkResultDisplay component.
 * It receives an array of final GameState objects, each representing
 * one fully simulated session (bankroll, rollNum, etc.).
 */
type BulkResultDisplayProps = {
  results: Array<GameState>;
};

/**
 * A small helper that returns min, max, mean, median, standard deviation,
 * quartiles, and histogram data *without* multiple sorts or big array spreads.
 * 
 * @param data      An array of numbers (e.g. final bankrolls).
 * @param binCount  The number of histogram bins, default 10.
 */
function computeAllStats(
  data: number[],
  binCount: number = 10
) {
  const n = data.length;
  if (n === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      standardDeviation: 0,
      q1: 0,
      q3: 0,
      histogram: [] as Array<{ binLabel: string; count: number }>
    };
  }

  // --- Single pass to find sum, sumOfSquares, min, and max
  let sum = 0;
  let sumSq = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < n; i++) {
    const val = data[i];
    sum += val;
    sumSq += val * val;
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }

  // --- Compute mean and standard deviation
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const standardDeviation = Math.sqrt(Math.max(0, variance));

  // --- To get median and quartiles, we do one sort
  const sorted = [...data];
  sorted.sort((a, b) => a - b);

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[(n - 1) / 2];

  // 25th and 75th percentile
  const q1 = percentileFromSorted(sorted, 25);
  const q3 = percentileFromSorted(sorted, 75);

  // --- Build histogram
  const histogram = computeHistogramData(sorted, minVal, maxVal, binCount);

  return {
    min: minVal,
    max: maxVal,
    mean,
    median,
    standardDeviation,
    q1,
    q3,
    histogram
  };
}

/**
 * Calculates a percentile (e.g. 25th, 75th) from a sorted array.
 * 
 * @param sorted A sorted numeric array.
 * @param p      The percentile to retrieve (0–100).
 */
function percentileFromSorted(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const n = sorted.length;
  if (n === 1) return sorted[0];

  const index = ((p / 100) * (n - 1));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Builds a histogram from minValue to maxValue in `binCount` bins,
 * using the already sorted array to place each data point in the right bin.
 * 
 * Avoids a large spread operator by manually tracking min/max instead of
 * `Math.min(...data)` or `Math.max(...data)`.
 */
function computeHistogramData(
  sorted: number[],
  minValue: number,
  maxValue: number,
  binCount: number
): Array<{ binLabel: string; count: number }> {
  const n = sorted.length;
  if (n === 0) return [];

  // If all values are identical, a single bin is enough
  if (minValue === maxValue) {
    return [{ binLabel: `${minValue}`, count: n }];
  }

  const binSize = (maxValue - minValue) / binCount;
  const bins = new Array(binCount).fill(0).map(() => ({ count: 0 }));

  let currentIndex = 0;
  for (let i = 0; i < n; i++) {
    const val = sorted[i];
    // If val == maxValue, put it in the last bin to avoid rounding issues
    if (val === maxValue) {
      bins[binCount - 1].count++;
      continue;
    }
    const binIndex = Math.floor((val - minValue) / binSize);
    bins[binIndex].count++;
  }

  // Build human‐friendly labels for each bin
  const histogramData = bins.map((b, i) => {
    const rangeStart = Math.round(minValue + i * binSize);
    const rangeEnd = Math.round(minValue + (i + 1) * binSize);
    return {
      binLabel: `${rangeStart} - ${rangeEnd}`,
      count: b.count
    };
  });

  return histogramData;
}

/**
 * A custom tooltip for the Recharts bar chart that shows
 * "Count: X (Y%)" on hover, with some theming for dark/light mode.
 */
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  totalCount: number;
  isDark: boolean;
  textColor: string;
}> = ({ active, payload, label, totalCount, isDark, textColor }) => {
  if (active && payload && payload.length) {
    const count = payload[0].value;
    const percentage = (count / totalCount) * 100;
    return (
      <div
        className="custom-tooltip"
        style={{
          backgroundColor: isDark ? '#333' : '#fff',
          color: textColor,
          padding: '5px',
          border: isDark ? '1px solid #555' : '1px solid #ccc'
        }}
      >
        <p>{label}</p>
        <p className="label">
          {`Count: ${count} (${convertToTwoDecimalPlaceString(percentage)}%)`}
        </p>
      </div>
    );
  }
  return null;
};

export const BulkResultDisplay = ({ results }: BulkResultDisplayProps) => {
  // Get theme for styling the chart
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#888' : '#ccc';
  const textColor = isDark ? '#fff' : '#000';
  const barFillColor = isDark ? '#4a90e2' : '#8884d8';
  const tooltipCursorFill = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const totalCount = results.length;
  if (totalCount === 0) {
    return <></>;
  }

  // Extract final bankrolls and roll counts
  const initialBankroll = results[0].configuration.initialBankroll || 0;
  const finalBankrolls = results.map((r) => r.bankroll);
  const rollNumbers = results.map((r) => r.rollNum);

  // --- Compute stats for final bankroll
  const bankrollStats = computeAllStats(finalBankrolls, 10);

  // --- Compute stats for roll counts
  const rollStats = computeAllStats(rollNumbers, 10);

  // For “Profitability,” how many are above the initial bankroll?
  const profitCount = finalBankrolls.filter((b) => b > initialBankroll).length;
  const profitRate = (profitCount / totalCount) * 100;
  // ROI = (meanEnding - initial) / initial * 100
  const roi = ((bankrollStats.mean - initialBankroll) / initialBankroll) * 100;

  // “Limit Reached” counts
  const bankrollMaxCount = results.filter((r) => r.limitReached() === LimitReached.BANKROLL_MAX).length;
  const bankrollMinCount = results.filter((r) => r.limitReached() === LimitReached.BANKROLL_MIN).length;
  const bustedCount = results.filter((r) => r.limitReached() === LimitReached.BUSTED).length;
  const maxRollsCount = results.filter((r) => r.limitReached() === LimitReached.MAX_ROLLS).length;

  // Some other rolling stats: e.g. median # of rolls
  const medianRollNum = rollStats.median;

  // Helper to show a percentage nicely, e.g. 0.375 => "37.50%"
  const toPercentString = (val: number) =>
    `${convertToTwoDecimalPlaceString(val * 100)}%`;

  return (
    <div>
      <h3>Number of Simulated Sessions: {totalCount}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MAX}: {toPercentString(bankrollMaxCount / totalCount)}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MIN}: {toPercentString(bankrollMinCount / totalCount)}</h3>
      <h3>Percentage of {LimitReached.BUSTED}: {toPercentString(bustedCount / totalCount)}</h3>
      <h3>Percentage of {LimitReached.MAX_ROLLS}: {toPercentString(maxRollsCount / totalCount)}</h3>
      <h3>Median number of rolls: {medianRollNum}</h3>
      <h5 className="mt-1">
        <ul>
          <li><b>Slow table:</b> Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Slow)}.</li>
          <li><b>Average table:</b> Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Average)}.</li>
          <li><b>Fast table:</b> Approx. {rollsToReadableDuration(medianRollNum, TableSpeed.Fast)}.</li>
        </ul>
      </h5>

      <Accordion defaultActiveKey={['0', '1']} alwaysOpen className="mt-4">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Final Bankroll Detailed Results</Accordion.Header>
          <Accordion.Body>
            <ul>
              <li><strong>Mean (Average):</strong> ${bankrollStats.mean.toFixed(2)}</li>
              <li><strong>Median:</strong> ${bankrollStats.median.toFixed(2)}</li>
              <li><strong>Min:</strong> ${bankrollStats.min.toFixed(2)}</li>
              <li><strong>Max:</strong> ${bankrollStats.max.toFixed(2)}</li>
              <li><strong>Standard Deviation:</strong> ${bankrollStats.standardDeviation.toFixed(2)}</li>
              <li><strong>25th Percentile (Q1):</strong> ${bankrollStats.q1.toFixed(2)}</li>
              <li><strong>75th Percentile (Q3):</strong> ${bankrollStats.q3.toFixed(2)}</li>
              <li><strong>Percentage of profitable simulations:</strong> {convertToTwoDecimalPlaceString(profitRate)}%</li>
              <li><strong>Average Return (ROI):</strong> {convertToTwoDecimalPlaceString(roi)}%</li>
            </ul>

            <h5>Final Bankroll Distribution</h5>
            {bankrollStats.histogram.length === 0 ? (
              <p>No data for histogram.</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={bankrollStats.histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke={axisColor} />
                    <XAxis dataKey="binLabel" stroke={textColor} />
                    <YAxis stroke={textColor} />
                    <Tooltip
                      cursor={{ fill: tooltipCursorFill }}
                      content={
                        <CustomTooltip
                          totalCount={totalCount}
                          isDark={isDark}
                          textColor={textColor}
                        />
                      }
                    />
                    <Bar dataKey="count" fill={barFillColor} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header>Number of Rolls Detailed Results</Accordion.Header>
          <Accordion.Body>
            <ul>
              <li><strong>Mean (Average):</strong> {rollStats.mean.toFixed(2)}</li>
              <li><strong>Median:</strong> {rollStats.median.toFixed(2)}</li>
              <li><strong>Min:</strong> {rollStats.min.toFixed(0)}</li>
              <li><strong>Max:</strong> {rollStats.max.toFixed(0)}</li>
              <li><strong>Standard Deviation:</strong> {rollStats.standardDeviation.toFixed(2)}</li>
              <li><strong>25th Percentile (Q1):</strong> {rollStats.q1.toFixed(2)}</li>
              <li><strong>75th Percentile (Q3):</strong> {rollStats.q3.toFixed(2)}</li>
            </ul>

            <h5>Roll Distribution</h5>
            {rollStats.histogram.length === 0 ? (
              <p>No data for histogram.</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={rollStats.histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke={axisColor} />
                    <XAxis dataKey="binLabel" stroke={textColor} />
                    <YAxis stroke={textColor} />
                    <Tooltip
                      cursor={{ fill: tooltipCursorFill }}
                      content={
                        <CustomTooltip
                          totalCount={totalCount}
                          isDark={isDark}
                          textColor={textColor}
                        />
                      }
                    />
                    <Bar dataKey="count" fill={barFillColor} />
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
