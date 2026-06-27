import React from 'react';
import { Badge } from 'react-bootstrap';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SessionAnalytics } from '../../../engine/Session';
import { useTheme } from '../../../app/ThemeProvider';
import { formatMoney, formatSignedMoney, formatTableTime, moneyTone, TableSpeed } from '../../../shared/format';
import { DistributionStats, HistogramBin } from '../../../shared/statistics';
import {
  analyzeBulkSessions,
  BulkDurationTrendPoint,
  BulkOutcome,
  BulkOutcomeId,
  BulkSessionAnalysis,
} from './analyzeBulkSessions';

type BulkSimulationResultsProps = {
  results: SessionAnalytics[];
};

type HistogramTooltipPayload = Array<{
  payload: HistogramBin;
}>;

type DurationTooltipPayload = Array<{
  value: number;
  payload: BulkDurationTrendPoint;
}>;

type DistributionSectionProps = {
  title: string;
  stats: DistributionStats;
  sessionCount: number;
  valueType: 'money' | 'rolls';
  axisColor: string;
  textColor: string;
  cursorFill: string;
};

const outcomeColors: Record<BulkOutcomeId, string> = {
  goal: '#20c997',
  floor: '#dc3545',
  busted: '#f08c00',
  'roll-limit': '#4dabf7',
};

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;

const formatRolls = (value: number): string => `${Math.round(value)} rolls`;

const contributionTone = (
  signal: 'positive' | 'negative' | 'uncertain',
  value: number
): string => signal === 'uncertain' ? 'is-neutral' : moneyTone(value);

const histogramRange = (bin: HistogramBin, valueType: 'money' | 'rolls'): string => {
  if (valueType === 'money') {
    if (bin.rangeStart === bin.rangeEnd) return formatSignedMoney(bin.rangeStart);
    return `${formatSignedMoney(bin.rangeStart)} to ${formatSignedMoney(bin.rangeEnd)}`;
  }

  if (bin.rangeStart === bin.rangeEnd) return formatRolls(bin.rangeStart);
  return `${Math.round(bin.rangeStart)} to ${Math.round(bin.rangeEnd)} rolls`;
};

const HistogramTooltip = ({
  active,
  payload,
  sessionCount,
  valueType,
}: {
  active?: boolean;
  payload?: HistogramTooltipPayload;
  sessionCount: number;
  valueType: 'money' | 'rolls';
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const bin = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{histogramRange(bin, valueType)}</strong>
      <div>{bin.count.toLocaleString()} sessions ({formatPercentage(bin.count / sessionCount * 100)})</div>
    </div>
  );
};

const DurationTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: DurationTooltipPayload;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>Roll {point.roll}</strong>
      <div>{formatPercentage(point.stillPlaying)} still playing</div>
      <div>{formatTableTime(point.roll)} at average table speed</div>
    </div>
  );
};

const DistributionSection = ({
  title,
  stats,
  sessionCount,
  valueType,
  axisColor,
  textColor,
  cursorFill,
}: DistributionSectionProps) => {
  const isMoney = valueType === 'money';
  const formatValue = isMoney
    ? formatSignedMoney
    : (value: number) => formatTableTime(value);
  const formatRange = (low: number, high: number) => `${formatValue(low)} to ${formatValue(high)}`;
  const statItems = isMoney
    ? [
        {
          label: 'Typical Finish',
          value: formatValue(stats.median),
          detail: 'Half finished above, half below',
        },
        {
          label: 'Common Range',
          value: formatRange(stats.q1, stats.q3),
          detail: 'The middle half of sessions',
        },
        {
          label: 'Rough Session',
          value: formatValue(stats.p10),
          detail: '1 in 10 finished at or below',
        },
        {
          label: 'Strong Session',
          value: formatValue(stats.p90),
          detail: '1 in 10 finished at or above',
        },
      ]
    : [
        {
          label: 'Typical Length',
          value: formatValue(stats.median),
          detail: formatRolls(stats.median),
        },
        {
          label: 'Common Range',
          value: formatRange(stats.q1, stats.q3),
          detail: `The middle half: ${Math.round(stats.q1)}-${Math.round(stats.q3)} rolls`,
        },
        {
          label: 'Short Session',
          value: formatValue(stats.p10),
          detail: `1 in 10 ended by ${Math.round(stats.p10)} rolls`,
        },
        {
          label: 'Long Session',
          value: formatValue(stats.p90),
          detail: `1 in 10 lasted at least ${Math.round(stats.p90)} rolls`,
        },
      ];

  return (
    <section className="bulk-section">
      <div className="section-heading-row">
        <h2>{title}</h2>
      </div>
      <div className="bulk-distribution-stats">
        {statItems.map(item => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>
      <div className="bulk-distribution-chart">
        <ResponsiveContainer>
          <BarChart data={stats.histogram} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.28} vertical={false} />
            <XAxis
              dataKey="binLabel"
              stroke={textColor}
              tick={{ fontSize: 11 }}
              minTickGap={18}
              tickFormatter={(label: string) => label.replace(' - ', '-')}
            />
            <YAxis stroke={textColor} tick={{ fontSize: 11 }} width={46} allowDecimals={false} />
            <RechartsTooltip
              cursor={{ fill: cursorFill }}
              content={<HistogramTooltip sessionCount={sessionCount} valueType={valueType} />}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {stats.histogram.map((bin, index) => {
                const midpoint = (bin.rangeStart + bin.rangeEnd) / 2;
                const fill = valueType === 'rolls'
                  ? '#4dabf7'
                  : bin.rangeStart < 0 && bin.rangeEnd > 0
                    ? '#6c757d'
                    : midpoint < 0 ? '#dc3545' : midpoint > 0 ? '#20c997' : '#6c757d';
                return <Cell key={`${bin.binLabel}-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

const outcomeTarget = (outcome: BulkOutcome): string | null => {
  if (outcome.configuredValue === null) return null;
  return outcome.id === 'roll-limit'
    ? formatRolls(outcome.configuredValue)
    : formatMoney(outcome.configuredValue);
};

const OutcomeBreakdown = ({ outcomes, sessionCount }: { outcomes: BulkOutcome[]; sessionCount: number }) => (
  <div className="bulk-outcome-breakdown">
    <div
      className="bulk-outcome-bar"
      role="img"
      aria-label={outcomes.map(outcome => `${outcome.label} ${formatPercentage(outcome.percentage)}`).join(', ')}
    >
      {outcomes.map(outcome => (
        <span
          key={outcome.id}
          style={{
            width: `${outcome.percentage}%`,
            backgroundColor: outcomeColors[outcome.id],
          }}
          title={`${outcome.label}: ${formatPercentage(outcome.percentage)}`}
        />
      ))}
    </div>
    <div className="bulk-outcome-list">
      {outcomes.map(outcome => {
        const target = outcomeTarget(outcome);
        return (
          <div key={outcome.id} className="bulk-outcome-row">
            <div className="bulk-outcome-name">
              <span style={{ backgroundColor: outcomeColors[outcome.id] }} />
              <div>
                <strong>{outcome.label}</strong>
                {target !== null && <small>{target}</small>}
              </div>
            </div>
            <strong>{formatPercentage(outcome.percentage)}</strong>
            <span>{outcome.count.toLocaleString()} of {sessionCount.toLocaleString()}</span>
            <span>
              {outcome.medianRolls === null
                ? '--'
                : `Median ${formatTableTime(outcome.medianRolls)} (${Math.round(outcome.medianRolls)} rolls)`}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const DurationChart = ({
  analysis,
  axisColor,
  textColor,
}: {
  analysis: BulkSessionAnalysis;
  axisColor: string;
  textColor: string;
}) => (
  <div className="bulk-outcome-chart">
    <div className="bulk-chart-title">Sessions Still Playing</div>
    <div className="bulk-outcome-chart-canvas">
      <ResponsiveContainer>
        <LineChart data={analysis.durationTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.18} />
          <XAxis dataKey="roll" stroke={textColor} tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis
            stroke={textColor}
            tick={{ fontSize: 11 }}
            width={42}
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
          />
          <RechartsTooltip content={<DurationTooltip />} />
          <Line
            name="Still Playing"
            type="stepAfter"
            dataKey="stillPlaying"
            stroke="#4dabf7"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const BulkSimulationResults = ({ results }: BulkSimulationResultsProps) => {
  const { theme } = useTheme();
  const analysis = React.useMemo(() => analyzeBulkSessions(results), [results]);

  if (analysis === null) return null;

  const { summary, outcomes, betPerformance, profitStats, rollStats } = analysis;
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#6c757d' : '#adb5bd';
  const textColor = isDark ? '#f8f9fa' : '#212529';
  const cursorFill = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div className="bulk-session-output">
      <section className="bulk-summary-grid" aria-label="Bulk simulation summary">
        <div className={`bulk-metric ${moneyTone(summary.hourlyProfit)}`}>
          <span>P/L per Table Hour</span>
          <strong>{formatSignedMoney(summary.hourlyProfit)}</strong>
          <small>Average session {formatSignedMoney(summary.averageProfit)}</small>
        </div>
        <div className={`bulk-metric ${moneyTone(summary.medianProfit)}`}>
          <span>Typical Finish</span>
          <strong>{formatSignedMoney(summary.medianProfit)}</strong>
          <small>Final bankroll {formatMoney(summary.initialBankroll + summary.medianProfit)}</small>
        </div>
        <div className="bulk-metric">
          <span>Finished Ahead</span>
          <strong>{formatPercentage(summary.profitablePercentage)}</strong>
          <small>{summary.profitableCount.toLocaleString()} of {summary.sessionCount.toLocaleString()}</small>
        </div>
        <div className="bulk-metric is-info">
          <span>Typical Session</span>
          <strong>{formatTableTime(summary.medianRolls)}</strong>
          <small>
            {formatTableTime(summary.medianRolls, TableSpeed.Fast)} fast
            {' | '}{formatTableTime(summary.medianRolls, TableSpeed.Slow)} slow
            {' | '}{formatRolls(summary.medianRolls)}
          </small>
        </div>
        <div className="bulk-metric bulk-metric-range">
          <span>Likely P/L Range</span>
          <strong>{formatSignedMoney(profitStats.p10)} to {formatSignedMoney(profitStats.p90)}</strong>
          <small>8 in 10 sessions finished in this range</small>
        </div>
        <div className="bulk-metric is-negative">
          <span>Typical Drawdown</span>
          <strong>{formatMoney(summary.medianMaxDrawdown)}</strong>
          <small>1 in 10 reached {formatMoney(summary.p90MaxDrawdown)} or more</small>
        </div>
      </section>

      <section className="bulk-section">
        <div className="section-heading-row">
          <h2>How Sessions End</h2>
          <Badge bg="secondary">{summary.sessionCount.toLocaleString()} sessions</Badge>
        </div>
        <div className="bulk-outcome-layout">
          <OutcomeBreakdown outcomes={outcomes} sessionCount={summary.sessionCount} />
          <DurationChart analysis={analysis} axisColor={axisColor} textColor={textColor} />
        </div>
      </section>

      <section className="bulk-section">
        <div className="section-heading-row bulk-contribution-heading">
          <h2>Bet Contribution</h2>
          <span className="bulk-section-meta">Best to worst by average session P/L</span>
        </div>
        <div className="bulk-bet-performance">
          <div className="bulk-bet-header">
            <span>Bet Type</span>
            <span>Avg Wagered</span>
            <span>P/L per Session</span>
            <span>P/L per Hour</span>
            <span>P/L per $100</span>
          </div>
          {betPerformance.map(bet => (
            <div key={bet.type} className="bulk-bet-row">
              <div className="bulk-bet-name">
                <strong>{bet.type}</strong>
                {bet.signal === 'uncertain' && <small>No clear positive or negative signal</small>}
              </div>
              <div>
                <span>Avg Wagered</span>
                <strong>{formatMoney(bet.averageWagered)}</strong>
              </div>
              <div className={contributionTone(bet.signal, bet.averageNet)}>
                <span>P/L per Session</span>
                <strong>{formatSignedMoney(bet.averageNet)}</strong>
              </div>
              <div className={contributionTone(bet.signal, bet.hourlyNet)}>
                <span>P/L per Hour</span>
                <strong>{formatSignedMoney(bet.hourlyNet)}</strong>
              </div>
              <div className={contributionTone(bet.signal, bet.netPerHundredWagered)}>
                <span>P/L per $100</span>
                <strong>{formatSignedMoney(bet.netPerHundredWagered)}</strong>
              </div>
            </div>
          ))}
          {betPerformance.length === 0 && (
            <div className="bulk-empty-state">No wagers settled during these sessions.</div>
          )}
        </div>
      </section>

      <DistributionSection
        title="What Session Results Look Like"
        stats={profitStats}
        sessionCount={summary.sessionCount}
        valueType="money"
        axisColor={axisColor}
        textColor={textColor}
        cursorFill={cursorFill}
      />

      <DistributionSection
        title="How Long Sessions Last"
        stats={rollStats}
        sessionCount={summary.sessionCount}
        valueType="rolls"
        axisColor={axisColor}
        textColor={textColor}
        cursorFill={cursorFill}
      />
    </div>
  );
};
