import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Row, Col, Card, Accordion, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { RollResult } from '../../game/Session';
import {
  rollsToReadableDuration,
  TableSpeed,
  convertToTwoDecimalPlaceString,
} from '../../util/Util';
import { SingleGameRollDisplay } from './SingleGameRollDisplay';
import { useTheme } from '../../theme/ThemeContext';
import { LimitReached } from '../../game/GameState';

interface SingleGameResultDisplayProps {
  results: RollResult[];
}

interface RollNetChange {
  roll: number;
  net: number;
}

interface Streak {
  count: number;
  sum: number;
  startRoll: number | null;
  endRoll: number | null;
}

const computeBestStreak = (rolls: RollNetChange[], predicate: (net: number) => boolean, compareStreak: (current: Streak, best: Streak) => boolean): Streak => {
  let best: Streak = { count: 0, sum: 0, startRoll: null, endRoll: null };
  let current: Streak = { count: 0, sum: 0, startRoll: null, endRoll: null };
  rolls.forEach((entry) => {
    if (predicate(entry.net)) {
      if (current.count === 0) {
        current = { count: 1, sum: entry.net, startRoll: entry.roll, endRoll: entry.roll };
      } else {
        current.count += 1;
        current.sum += entry.net;
        current.endRoll = entry.roll;
      }
    } else {
      if (compareStreak(current, best)) best = { ...current };
      current = { count: 0, sum: 0, startRoll: null, endRoll: null };
    }
  });
  if (compareStreak(current, best)) best = { ...current };
  return best;
};

export const SingleGameResultDisplay: React.FC<SingleGameResultDisplayProps> = ({ results }) => {
  const { theme } = useTheme();

  if (results.length === 0) return null;

  const bankrollHistoryChart = [
    { roll: results[0].initialState.rollNum + 1, bankroll: results[0].initialState.bankroll },
    ...results.map((result) => ({ roll: result.resultingState.rollNum + 1, bankroll: result.resultingState.bankroll })),
  ];

  const rollNetChanges: RollNetChange[] = results.map((result) => ({
    roll: result.initialState.rollNum + 1,
    net: result.resultingState.bankroll - result.initialState.bankroll,
  }));

  const biggestWinEntry = rollNetChanges.reduce((max, current) => current.net > max.net ? current : max, rollNetChanges[0]);
  const biggestLossEntry = rollNetChanges.reduce((min, current) => current.net < min.net ? current : min, rollNetChanges[0]);

  const bestWinStreak = computeBestStreak(rollNetChanges, (net) => net > 0, (current, best) => current.count > best.count || (current.count === best.count && current.sum > best.sum));
  const bestLossStreak = computeBestStreak(rollNetChanges, (net) => net < 0, (current, best) => current.count > best.count || (current.count === best.count && current.sum < best.sum));

  const maxBankrollEntry = bankrollHistoryChart.reduce((max, current) => current.bankroll > max.bankroll ? current : max, bankrollHistoryChart[0]);
  const minBankrollEntry = bankrollHistoryChart.reduce((min, current) => current.bankroll < min.bankroll ? current : min, bankrollHistoryChart[0]);

  const isDark = theme === 'dark';
  const axisColor = isDark ? "#888" : "#ccc";
  const textColor = isDark ? "#fff" : "#000";
  const lineColor = isDark ? "#4a90e2" : "#8884d8";
  const tooltipCursorFill = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  const CustomTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="mb-1"><strong>Roll:</strong> {dataPoint.roll}</p>
          <p className="mb-0"><strong>Bankroll:</strong> ${dataPoint.bankroll.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const listItems = results.map((result) => (
    <SingleGameRollDisplay key={result.initialState.rollNum} result={result} eventKey={result.initialState.rollNum.toString()} />
  ));

  const lastRoll = results[results.length - 1];
  const endBankroll = lastRoll.resultingState.bankroll;
  const initialBankroll = results[0].initialState.bankroll;
  const profit = endBankroll - initialBankroll;
  const limitReached = lastRoll.resultingState.limitReached();
  const totalRolls = lastRoll.resultingState.rollNum;

  const renderTableTimeTooltip = (props: any) => (
    <Tooltip id="table-time-tooltip" {...props}>
      <div className="text-start">
        <div><strong>Slow:</strong> {rollsToReadableDuration(totalRolls, TableSpeed.Slow)}</div>
        <div><strong>Fast:</strong> {rollsToReadableDuration(totalRolls, TableSpeed.Fast)}</div>
      </div>
    </Tooltip>
  );

  return (
    <div className="mt-4">
      {/* 1. Scorecard Grid */}
      <Row className="g-3 mb-4 row-cols-2 row-cols-lg-4">
        <Col>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h3 className={profit >= 0 ? "text-success mb-0" : "text-danger mb-0"}>${endBankroll.toFixed(2)}</h3>
              <small className="text-muted">Final Bankroll {profit >= 0 ? `(+$${profit.toFixed(2)})` : `(-$${Math.abs(profit).toFixed(2)})`}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h4 className={limitReached === LimitReached.BANKROLL_MAX ? "text-success mb-0" : (limitReached === LimitReached.BUSTED ? "text-danger mb-0" : "text-primary mb-0")}>
                {limitReached === LimitReached.BANKROLL_MAX ? 'Hit Max' : limitReached === LimitReached.BUSTED ? 'Busted' : limitReached}
              </h4>
              <small className="text-muted">Limit Reached</small>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h3 className="mb-0">{totalRolls}</h3>
              <small className="text-muted">Total Rolls</small>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <OverlayTrigger placement="bottom" overlay={renderTableTimeTooltip}>
            <Card className="h-100 text-center shadow-sm" style={{ cursor: 'help' }}>
              <Card.Body className="d-flex flex-column justify-content-center">
                <h4 className="text-info mb-0">{rollsToReadableDuration(totalRolls, TableSpeed.Average)}</h4>
                <small className="text-muted text-decoration-underline">Avg. Table Time</small>
              </Card.Body>
            </Card>
          </OverlayTrigger>
        </Col>
      </Row>

      {/* 2. Highlights & Chart */}
      <Row className="align-items-stretch mb-5">
        <Col md={4} className="mb-4 mb-md-0">
          <h5 className="mb-3">Session Highlights</h5>
          <div className="d-flex flex-column gap-2 h-100 pb-md-4">
            <Card className="shadow-sm flex-fill">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-bold text-uppercase">Biggest Win</span>
                  {biggestWinEntry.net > 0 && <Badge bg="success">Roll #{biggestWinEntry.roll}</Badge>}
                </div>
                <h5 className="text-success m-0">{biggestWinEntry.net > 0 ? `+$${convertToTwoDecimalPlaceString(biggestWinEntry.net)}` : '--'}</h5>
              </Card.Body>
            </Card>
            <Card className="shadow-sm flex-fill">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-bold text-uppercase">Biggest Loss</span>
                  {biggestLossEntry.net < 0 && <Badge bg="danger">Roll #{biggestLossEntry.roll}</Badge>}
                </div>
                <h5 className="text-danger m-0">{biggestLossEntry.net < 0 ? `-$${convertToTwoDecimalPlaceString(Math.abs(biggestLossEntry.net))}` : '--'}</h5>
              </Card.Body>
            </Card>
            <Card className="shadow-sm flex-fill">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-bold text-uppercase">Win Streak</span>
                  {bestWinStreak.count > 0 && <Badge bg="success">{bestWinStreak.count} rolls</Badge>}
                </div>
                <h5 className="text-success m-0">{bestWinStreak.count > 0 ? `+$${convertToTwoDecimalPlaceString(bestWinStreak.sum)}` : '--'}</h5>
              </Card.Body>
            </Card>
            <Card className="shadow-sm flex-fill">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-bold text-uppercase">Loss Streak</span>
                  {bestLossStreak.count > 0 && <Badge bg="danger">{bestLossStreak.count} rolls</Badge>}
                </div>
                <h5 className="text-danger m-0">{bestLossStreak.count > 0 ? `-$${convertToTwoDecimalPlaceString(Math.abs(bestLossStreak.sum))}` : '--'}</h5>
              </Card.Body>
            </Card>
          </div>
        </Col>
        <Col md={8}>
          <h5 className="mb-3">Bankroll Evolution</h5>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={bankrollHistoryChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.3} />
                <XAxis dataKey="roll" stroke={textColor} tick={{fontSize: 12}} minTickGap={20} />
                <YAxis stroke={textColor} tick={{fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: tooltipCursorFill }} />
                <Line type="monotone" dataKey="bankroll" stroke={lineColor} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* 3. The Casino Ledger (Feed) */}
      <h4 className="mt-5 border-bottom pb-2">Casino Ledger</h4>
      <Row className="bg-body-tertiary rounded p-2 mb-2 m-0 d-none d-md-flex text-muted small fw-bold text-uppercase" style={{ letterSpacing: '1px' }}>
          <Col md={1} className="text-start">Roll</Col>
          <Col md={1}>Dice</Col>
          <Col md={3} className="text-start">Outcome</Col>
          <Col md={3}>Table Action</Col>
          <Col md={2} className="text-start">Net Flow</Col>
          <Col md={2} className="text-end">Bankroll</Col>
      </Row>
      <Accordion className="shadow-sm">
        {listItems}
      </Accordion>
    </div>
  );
};
