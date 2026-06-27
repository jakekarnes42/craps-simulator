import React from 'react';
import { Accordion, Badge } from 'react-bootstrap';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { LimitReached } from '../../../engine/GameState';
import { RollResult } from '../../../engine/Session';
import { useTheme } from '../../../app/ThemeProvider';
import { formatMoney, formatSignedMoney, formatTableTime, moneyTone, TableSpeed } from '../../../shared/format';
import { RollDetails } from './RollDetails';
import { analyzeSingleSession, EventTone, SessionTrendPoint } from './analyzeSingleSession';

type SingleSessionResultsProps = {
  results: RollResult[];
};

type ChartTooltipPayload = Array<{
  payload: SessionTrendPoint;
}>;

const eventToneClass = (tone: EventTone): string => `is-${tone}`;

const stopReasonLabel = (reason: LimitReached | null): string => {
  if (reason === LimitReached.BANKROLL_MAX) return 'Hit Goal';
  if (reason === LimitReached.BUSTED) return 'Busted';
  return reason ?? 'Complete';
};

const moneyEventValue = (value: number | string, signed: boolean): string => (
  typeof value === 'number'
    ? signed ? formatSignedMoney(value) : formatMoney(value)
    : value
);

const chartDomain = (values: number[]): [number, number] => {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const targetStep = Math.max(maximum - minimum, 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const normalizedStep = targetStep / magnitude;
  const multiplier = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
  const step = multiplier * magnitude;

  return [
    Math.max(0, Math.floor((minimum - step * 0.25) / step) * step),
    Math.ceil((maximum + step * 0.25) / step) * step,
  ];
};

export const SingleSessionResults: React.FC<SingleSessionResultsProps> = ({ results }) => {
  const { theme } = useTheme();
  const analysis = React.useMemo(() => analyzeSingleSession(results), [results]);

  if (analysis === null) return null;

  const { summary, trend, keyEvents, ledgerRows } = analysis;
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#6c757d' : '#adb5bd';
  const textColor = isDark ? '#f8f9fa' : '#212529';
  const finalTone = moneyTone(summary.profit);
  const financialValues = trend.flatMap(point => [point.cash, point.equity]);
  const financialDomain = chartDomain(financialValues);
  const exposureDomain = [0, Math.max(10, Math.ceil(summary.maxExposure * 1.15))];

  const ChartTooltip: React.FC<{ active?: boolean; payload?: ChartTooltipPayload }> = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <div><strong>Roll:</strong> {point.roll}</div>
        <div><strong>Cash:</strong> {formatMoney(point.cash)}</div>
        <div><strong>Equity:</strong> {formatMoney(point.equity)}</div>
        <div><strong>On Table:</strong> {formatMoney(point.exposure)}</div>
      </div>
    );
  };

  return (
    <div className="single-session-output">
      <section className="single-summary-grid" aria-label="Single session summary">
        <div className={`single-metric ${finalTone}`}>
          <span>Net Profit</span>
          <strong>{formatSignedMoney(summary.profit)}</strong>
          <small>Final cash {formatMoney(summary.finalCash)}</small>
        </div>
        <div className="single-metric is-neutral">
          <span>Stop Reason</span>
          <strong>{stopReasonLabel(summary.stopReason)}</strong>
          <small>{summary.totalRolls} rolls</small>
        </div>
        <div className="single-metric is-positive">
          <span>Peak Equity</span>
          <strong>{formatMoney(summary.peakEquity)}</strong>
          <small>Roll {summary.peakEquityRoll}</small>
        </div>
        <div className="single-metric is-negative">
          <span>Max Drawdown</span>
          <strong>{formatMoney(summary.maxDrawdown)}</strong>
          <small>{summary.maxDrawdownRoll === null ? 'No drawdown' : `Roll ${summary.maxDrawdownRoll}`}</small>
        </div>
        <div className="single-metric is-attention">
          <span>Peak Exposure</span>
          <strong>{formatMoney(summary.maxExposure)}</strong>
          <small>{summary.maxExposureRoll === null ? 'No active wagers' : `Roll ${summary.maxExposureRoll}`}</small>
        </div>
        <div className="single-metric is-info">
          <span>Table Time</span>
          <strong>{formatTableTime(summary.totalRolls, TableSpeed.Average)}</strong>
          <small>
            {formatTableTime(summary.totalRolls, TableSpeed.Fast)} fast
            {' | '}{formatTableTime(summary.totalRolls, TableSpeed.Slow)} slow
          </small>
        </div>
      </section>

      <section className="single-session-main">
        <div className="single-chart-panel">
          <div className="section-heading-row">
            <h2>Cash & Equity</h2>
            <Badge bg="secondary">{summary.totalRolls} rolls</Badge>
          </div>
          <div className="single-financial-chart">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.32} />
                <XAxis dataKey="roll" hide />
                <YAxis stroke={textColor} tick={{ fontSize: 12 }} domain={financialDomain} tickCount={5} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line name="Equity" type="monotone" dataKey="equity" stroke="#20c997" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                <Line name="Cash" type="monotone" dataKey="cash" stroke="#4dabf7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="section-heading-row single-exposure-heading">
            <h2>On-Table Exposure</h2>
            <Badge bg="secondary">Peak {formatMoney(summary.maxExposure)}</Badge>
          </div>
          <div className="single-exposure-chart">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.22} vertical={false} />
                <XAxis dataKey="roll" stroke={textColor} tick={{ fontSize: 11 }} minTickGap={18} />
                <YAxis stroke={textColor} tick={{ fontSize: 11 }} domain={exposureDomain} width={42} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Line name="On Table" type="stepAfter" dataKey="exposure" stroke="#ffc107" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="single-events-panel">
          <div className="section-heading-row">
            <h2>Key Events</h2>
          </div>
          <div className="single-event-list">
            {keyEvents.map(event => (
              <div key={event.id} className={`single-event-row ${eventToneClass(event.tone)}`}>
                <div>
                  <span>{event.label}</span>
                  <small>{event.detail}</small>
                </div>
                <div className="single-event-value">
                  <strong>{moneyEventValue(event.value, event.signed)}</strong>
                  {event.rollLabel !== null && <small>{event.rollLabel}</small>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="single-ledger-section">
        <div className="section-heading-row">
          <h2>Roll Ledger</h2>
        </div>
        <div className="single-ledger-header">
          <span>Roll</span>
          <span>Outcome</span>
          <span>Placed</span>
          <span>Wager P/L</span>
          <span>Equity Change</span>
          <span>Cash / Equity</span>
        </div>
        <Accordion className="single-ledger-list">
          {ledgerRows.map(row => (
            <RollDetails key={row.id} row={row} eventKey={row.eventKey} />
          ))}
        </Accordion>
      </section>
    </div>
  );
};
