import { GameState, LimitReached } from '../../game/GameState';
import { useTheme } from '../../theme/ThemeContext';
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
  // Use our theme to select appropriate colors
  const { theme } = useTheme();

  const totalCount = results.length;
  if (totalCount === 0) {
    return (<></>);
  }

  // Compute stats for final bankroll
  const finalBankrolls = results.map(r => r.bankroll);
  const bankrollStats = computeSummaryStats(finalBankrolls);
  const bankrollHistogramData = computeHistogramData(finalBankrolls, 10);

  // Compute stats for number of rolls (session duration in rolls)
  const rollNumbers = results.map(r => r.rollNum);
  const rollStats = computeSummaryStats(rollNumbers);
  const rollHistogramData = computeHistogramData(rollNumbers, 10);
  const medianRollNum = median(rollNumbers);

  // Get the initial bankroll from the configuration (assumes all sessions share the same config)
  const initialBankroll = results[0].configuration.initialBankroll || 0;

  // Profitability Metrics for final bankroll:
  const profitCount = finalBankrolls.filter(b => b > initialBankroll).length;
  const profitRate = (profitCount / totalCount) * 100;
  const roi = ((bankrollStats.mean - initialBankroll) / initialBankroll) * 100;

  // Helper: compute a percentile for an array of numbers.
  const percentile = (data: number[], p: number): number => {
    const sorted = [...data].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  // Compute quartiles for final bankroll and roll numbers:
  const Q1_bankroll = percentile(finalBankrolls, 25);
  const Q3_bankroll = percentile(finalBankrolls, 75);
  const Q1_roll = percentile(rollNumbers, 25);
  const Q3_roll = percentile(rollNumbers, 75);

  // Helper to format percentages
  const convertToPercentageString = (num: number) => convertToTwoDecimalPlaceString(num * 100) + '%';

  // Already existing percentages for different limits:
  const bankrollMaxCount = results.filter(r => r.limitReached() === LimitReached.BANKROLL_MAX).length;
  const bankrollMinCount = results.filter(r => r.limitReached() === LimitReached.BANKROLL_MIN).length;
  const bustedCount = results.filter(r => r.limitReached() === LimitReached.BUSTED).length;
  const maxRollsCount = results.filter(r => r.limitReached() === LimitReached.MAX_ROLLS).length;


  const isDark = theme === 'dark';
  const axisColor = isDark ? "#888" : "#ccc";
  const textColor = isDark ? "#fff" : "#000";
  const barFillColor = isDark ? "#4a90e2" : "#8884d8";
  const tooltipCursorFill = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  // Custom tooltip component for Recharts showing count and percentage.
  const CustomTooltip = ({ active, payload, label }: any) => {
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
            border: isDark ? "1px solid #555" : "1px solid #ccc"
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

  return (
    <div>
      <h3>Number of Simulated Sessions: {totalCount}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MAX}: {convertToPercentageString(bankrollMaxCount / totalCount)}</h3>
      <h3>Percentage of {LimitReached.BANKROLL_MIN}: {convertToPercentageString(bankrollMinCount / totalCount)}</h3>
      <h3>Percentage of {LimitReached.BUSTED}: {convertToPercentageString(bustedCount / totalCount)}</h3>
      <h3>Percentage of {LimitReached.MAX_ROLLS}: {convertToPercentageString(maxRollsCount / totalCount)}</h3>
      <h3>Median number of rolls: {medianRollNum}</h3>
      <h5 className='mt-1'>
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
              <li><strong>25th Percentile (Q1):</strong> ${Q1_bankroll.toFixed(2)}</li>
              <li><strong>75th Percentile (Q3):</strong> ${Q3_bankroll.toFixed(2)}</li>
              <li><strong>Percentage of profitable simulations:</strong> {convertToTwoDecimalPlaceString(profitRate)}%</li>
              <li><strong>Average Return:</strong> {convertToTwoDecimalPlaceString(roi)}%</li>
            </ul>

            <h5>Final Bankroll Distribution</h5>
            {bankrollHistogramData.length === 0 ? (
              <p>No data for histogram.</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={bankrollHistogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={axisColor} />
                    <XAxis dataKey="binLabel" stroke={textColor} />
                    <YAxis stroke={textColor} />
                    <Tooltip content={CustomTooltip} cursor={{ fill: tooltipCursorFill }} />
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
              <li><strong>Min:</strong> {rollStats.min}</li>
              <li><strong>Max:</strong> {rollStats.max}</li>
              <li><strong>Standard Deviation:</strong> {rollStats.standardDeviation.toFixed(2)}</li>
              <li><strong>25th Percentile (Q1):</strong> {Q1_roll.toFixed(2)}</li>
              <li><strong>75th Percentile (Q3):</strong> {Q3_roll.toFixed(2)}</li>
            </ul>

            <h5>Roll Distribution</h5>
            {rollHistogramData.length === 0 ? (
              <p>No data for histogram.</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={rollHistogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={axisColor} />
                    <XAxis dataKey="binLabel" stroke={textColor} />
                    <YAxis stroke={textColor} />
                    <Tooltip content={CustomTooltip} cursor={{ fill: tooltipCursorFill }} />
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
