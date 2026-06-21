import React from 'react';
import { Row, Col, Card, Table } from 'react-bootstrap';
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
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { SessionAnalytics } from '../../game/Session';

type BulkResultDisplayProps = {
  results: Array<SessionAnalytics>;
};

function computeAllStats(data: number[], binCount: number = 10) {
  const n = data.length;
  if (n === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, standardDeviation: 0, q1: 0, q3: 0, histogram: [] };
  }

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

  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const standardDeviation = Math.sqrt(Math.max(0, variance));

  const sorted = [...data];
  sorted.sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];

  const q1 = percentileFromSorted(sorted, 25);
  const q3 = percentileFromSorted(sorted, 75);
  const histogram = computeHistogramData(sorted, minVal, maxVal, binCount);

  return { min: minVal, max: maxVal, mean, median, standardDeviation, q1, q3, histogram };
}

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

function computeHistogramData(sorted: number[], minValue: number, maxValue: number, binCount: number) {
  const n = sorted.length;
  if (n === 0) return [];
  if (minValue === maxValue) return [{ binLabel: `${minValue}`, count: n }];

  const binSize = (maxValue - minValue) / binCount;
  const bins = new Array(binCount).fill(0).map(() => ({ count: 0 }));

  for (let i = 0; i < n; i++) {
    const val = sorted[i];
    if (val === maxValue) {
      bins[binCount - 1].count++;
      continue;
    }
    const binIndex = Math.floor((val - minValue) / binSize);
    bins[binIndex].count++;
  }

  return bins.map((b, i) => {
    const rangeStart = Math.round(minValue + i * binSize);
    const rangeEnd = Math.round(minValue + (i + 1) * binSize);
    return { binLabel: `${rangeStart} - ${rangeEnd}`, count: b.count };
  });
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string; totalCount: number; isDark: boolean; textColor: string; }> = ({ active, payload, label, totalCount }) => {
  if (active && payload && payload.length) {
    const count = payload[0].value;
    const percentage = (count / totalCount) * 100;
    return (
      <div className="chart-tooltip">
        <p className="mb-1"><strong>{label}</strong></p>
        <p className="mb-0">{`Count: ${count} (${convertToTwoDecimalPlaceString(percentage)}%)`}</p>
      </div>
    );
  }
  return null;
};

export const BulkResultDisplay = ({ results }: BulkResultDisplayProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#888' : '#ccc';
  const textColor = isDark ? '#fff' : '#000';
  const barFillColor = isDark ? '#4a90e2' : '#8884d8';
  const tooltipCursorFill = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const totalCount = results.length;
  if (totalCount === 0) return <></>;

  const initialBankroll = results[0].finalState.configuration.initialBankroll || 0;
  const finalBankrolls = results.map(r => r.finalState.bankroll);
  const rollNumbers = results.map(r => r.rollCount);
  const bankrollStats = computeAllStats(finalBankrolls, 10);
  const rollStats = computeAllStats(rollNumbers, 10);

  // Scorecard Metrics
  const bankrollMaxCount = results.filter(r => r.finalState.limitReached() === LimitReached.BANKROLL_MAX).length;
  const successRate = ((bankrollMaxCount / totalCount) * 100).toFixed(2);
  
  const bustedCount = results.filter(r => r.finalState.limitReached() === LimitReached.BUSTED).length;
  const bankrollMinCount = results.filter(r => r.finalState.limitReached() === LimitReached.BANKROLL_MIN).length;
  const riskOfRuin = (((bustedCount + bankrollMinCount) / totalCount) * 100).toFixed(2);
  
  const maxRollsCount = results.filter(r => r.finalState.limitReached() === LimitReached.MAX_ROLLS).length;
  const maxRollsRate = ((maxRollsCount / totalCount) * 100).toFixed(2);

  const avgProfit = bankrollStats.mean - initialBankroll;
  const avgHours = (rollStats.mean * 45) / 3600; // 45 seconds per roll average
  const hourlyPnL = avgHours > 0 ? (avgProfit / avgHours).toFixed(2) : '0.00';

  // Ride Metrics
  const avgMaxDrawdown = results.reduce((acc, r) => acc + r.maxDrawdown, 0) / totalCount;
  const total7Outs = results.reduce((acc, r) => acc + r.sevenOutCount, 0);
  const total7Wipe = results.reduce((acc, r) => acc + r.totalSevenOutWipe, 0);
  const avg7Cost = total7Outs > 0 ? total7Wipe / total7Outs : 0;

  // Survival Curve Data
  const deathRolls = results.map(r => {
      const limit = r.finalState.limitReached();
      if (limit === LimitReached.BANKROLL_MAX || limit === LimitReached.MAX_ROLLS) return Infinity;
      return r.rollCount;
  });
  const sortedDeathRolls = [...deathRolls].sort((a,b)=>a-b);
  const survivalData = [];
  const maxRollsCurve = rollNumbers.reduce((a, b) => Math.max(a, b), 0);
  const step = Math.max(1, Math.floor(maxRollsCurve / 100));
  for(let i=0; i<=maxRollsCurve; i+=step) {
      const survived = sortedDeathRolls.filter(death => death > i).length;
      survivalData.push({ roll: i, survivalPct: parseFloat(((survived / totalCount) * 100).toFixed(2)) });
  }

  // Attribution Data
  const globalAttribution: Record<string, {won: number, lost: number, net: number}> = {};
  for(const r of results) {
      for(const [type, stats] of Object.entries(r.betAttribution)) {
          if(!globalAttribution[type]) globalAttribution[type] = {won: 0, lost: 0, net: 0};
          globalAttribution[type].won += stats.won;
          globalAttribution[type].lost += stats.lost;
          globalAttribution[type].net += (stats.won - stats.lost);
      }
  }
  const attributionData = Object.entries(globalAttribution)
    .map(([name, data]) => ({ 
      name, 
      won: data.won / totalCount,
      lost: data.lost / totalCount,
      net: data.net / totalCount 
    }))
    .filter(d => d.net !== 0)
    .sort((a,b) => b.net - a.net);

  return (
    <div className="mt-4">
      {/* Section 1: Scorecard */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={4} lg>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h3 className="text-success mb-0">{successRate}%</h3>
              <small className="text-muted">Hit Bankroll Goal</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={4} lg>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h3 className="text-danger mb-0">{riskOfRuin}%</h3>
              <small className="text-muted">Risk of Ruin</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={4} lg>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h3 className="text-primary mb-0">{maxRollsRate}%</h3>
              <small className="text-muted">Hit Roll Limit</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={6} lg>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h3 className={parseFloat(hourlyPnL) >= 0 ? "text-success mb-0" : "text-warning mb-0"}>
                 {parseFloat(hourlyPnL) > 0 ? '+' : ''}${hourlyPnL}
              </h3>
              <small className="text-muted">Expected Hourly P&L</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} lg>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h4 className="text-info mb-0">{rollsToReadableDuration(rollStats.median, TableSpeed.Average)}</h4>
              <small className="text-muted">Median Table Time</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Section 2: The Ride */}
      <h4 className="mt-5 border-bottom pb-2">The Ride (Volatility & Survival)</h4>
      <Row className="mt-3 align-items-center">
        <Col md={4}>
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <h4 className="text-danger mb-0">-${avgMaxDrawdown.toFixed(2)}</h4>
              <small className="text-muted">Average Max Drawdown</small>
            </Card.Body>
          </Card>
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <h4 className="text-warning mb-0">-${avg7Cost.toFixed(2)}</h4>
              <small className="text-muted">True Cost of a 7-Out</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={survivalData}>
                <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.3} />
                <XAxis dataKey="roll" stroke={textColor} tick={{ fontSize: 12 }} minTickGap={20} />
                <YAxis stroke={textColor} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bs-body-bg)', color: 'var(--bs-body-color)', borderRadius: '8px', border: '1px solid var(--bs-border-color)' }} />
                <Line type="monotone" dataKey="survivalPct" stroke="#ff7300" dot={false} strokeWidth={3} name="Survival %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* Section 3: Money Flow */}
      <h4 className="mt-5 border-bottom pb-2">The Money Flow (P&L Attribution)</h4>
      <div className="table-responsive mt-3 shadow-sm rounded">
        <Table variant={isDark ? 'dark' : 'light'} striped bordered hover className="mb-0 text-center">
          <thead>
            <tr>
              <th className="text-start">Bet Type</th>
              <th>Avg Won</th>
              <th>Avg Lost</th>
              <th>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {attributionData.map(d => (
              <tr key={d.name}>
                <td className="text-start align-middle">{d.name}</td>
                <td className="text-success align-middle">+${d.won.toFixed(2)}</td>
                <td className="text-danger align-middle">-${d.lost.toFixed(2)}</td>
                <td className={`align-middle fw-bold ${d.net >= 0 ? 'text-success' : 'text-danger'}`}>
                  {d.net > 0 ? '+' : ''}${d.net.toFixed(2)}
                </td>
              </tr>
            ))}
            {attributionData.length === 0 && (
              <tr><td colSpan={4} className="text-muted">No bet attribution data available.</td></tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Section 4: Bankroll Distribution */}
      <h4 className="mt-5 border-bottom pb-2">Final Bankroll Distribution</h4>
      <Row className="mt-3 align-items-center">
        <Col md={3} className="mb-3 mb-md-0">
          <Card className="shadow-sm">
             <Card.Body className="p-2 p-md-3">
               <Table size="sm" borderless className="mb-0">
                 <tbody>
                   <tr><td>Mean</td><td className="text-end">${bankrollStats.mean.toFixed(2)}</td></tr>
                   <tr><td>Median</td><td className="text-end">${bankrollStats.median.toFixed(2)}</td></tr>
                   <tr><td>Min</td><td className="text-end">${bankrollStats.min.toFixed(2)}</td></tr>
                   <tr><td>Max</td><td className="text-end">${bankrollStats.max.toFixed(2)}</td></tr>
                   <tr><td>Std Dev</td><td className="text-end">${bankrollStats.standardDeviation.toFixed(2)}</td></tr>
                   <tr><td>Q1 (25%)</td><td className="text-end">${bankrollStats.q1.toFixed(2)}</td></tr>
                   <tr><td>Q3 (75%)</td><td className="text-end">${bankrollStats.q3.toFixed(2)}</td></tr>
                 </tbody>
               </Table>
             </Card.Body>
          </Card>
        </Col>
        <Col md={9}>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={bankrollStats.histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.3} />
                <XAxis dataKey="binLabel" stroke={textColor} tick={{ fontSize: 12 }} />
                <YAxis stroke={textColor} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: tooltipCursorFill }} content={<CustomTooltip totalCount={totalCount} />} />
                <Bar dataKey="count" fill={barFillColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* Section 5: Roll Distribution */}
      <h4 className="mt-5 border-bottom pb-2">Number of Rolls Distribution</h4>
      <Row className="mt-3 mb-5 align-items-center">
        <Col md={3} className="mb-3 mb-md-0">
          <Card className="shadow-sm">
             <Card.Body className="p-2 p-md-3">
               <Table size="sm" borderless className="mb-0">
                 <tbody>
                   <tr><td>Mean</td><td className="text-end">{rollStats.mean.toFixed(2)}</td></tr>
                   <tr><td>Median</td><td className="text-end">{rollStats.median.toFixed(2)}</td></tr>
                   <tr><td>Min</td><td className="text-end">{rollStats.min.toFixed(0)}</td></tr>
                   <tr><td>Max</td><td className="text-end">{rollStats.max.toFixed(0)}</td></tr>
                   <tr><td>Std Dev</td><td className="text-end">{rollStats.standardDeviation.toFixed(2)}</td></tr>
                   <tr><td>Q1 (25%)</td><td className="text-end">{rollStats.q1.toFixed(2)}</td></tr>
                   <tr><td>Q3 (75%)</td><td className="text-end">{rollStats.q3.toFixed(2)}</td></tr>
                 </tbody>
               </Table>
             </Card.Body>
          </Card>
        </Col>
        <Col md={9}>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={rollStats.histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.3} />
                <XAxis dataKey="binLabel" stroke={textColor} tick={{ fontSize: 12 }} />
                <YAxis stroke={textColor} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: tooltipCursorFill }} content={<CustomTooltip totalCount={totalCount} />} />
                <Bar dataKey="count" fill={barFillColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>
    </div>
  );
};
