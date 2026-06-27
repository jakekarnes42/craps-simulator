import { BsTrash } from 'react-icons/bs';
import { Configuration } from '../../engine/Configuration';
import { CRAPS_NUMBERS, CrapsNumber } from '../../engine/NumberBets';
import { formatDecimal } from '../../shared/format';
import {
  numberForZone,
  StrategyEditor,
  StrategyMacro,
  StrategyZone,
  zoneForNumber,
} from './selection';

type BetBoardProps = {
  activeEditor: StrategyEditor;
  selectedNumbers: CrapsNumber[];
  configuration: Configuration;
  onZoneActivate: (zone: StrategyZone) => void;
  onMacroSelect: (macro: StrategyMacro) => void;
  onClearAllBets: () => void;
};

const lineZones: Array<{ zone: StrategyZone; label: string }> = [
  { zone: 'COME', label: 'Come' },
  { zone: 'DONT_COME', label: "Don't Come" },
  { zone: 'PASS', label: 'Pass Line' },
  { zone: 'DONT_PASS', label: "Don't Pass" },
];

export const BetBoard = ({
  activeEditor,
  selectedNumbers,
  configuration,
  onZoneActivate,
  onMacroSelect,
  onClearAllBets,
}: BetBoardProps): JSX.Element => {
  const amountForZone = (zone: StrategyZone): number | null => {
    const number = numberForZone(zone);
    if (number !== undefined) return configuration.effectiveNumberBet(number);

    switch (zone) {
      case 'PASS': return configuration.passBet;
      case 'DONT_PASS': return configuration.dontPassBet;
      case 'COME': return configuration.comeBet;
      case 'DONT_COME': return configuration.dontComeBet;
      default: return null;
    }
  };

  const renderZoneButton = (zone: StrategyZone, label: string) => {
    const amount = amountForZone(zone);
    const number = numberForZone(zone);
    const isActive = number === undefined
      ? activeEditor === zone
      : activeEditor === 'NUMBERS' && selectedNumbers.includes(number);
    const isConfigured = amount !== null && amount > 0;

    return (
      <button
        key={zone}
        type="button"
        className={`bet-zone ${isActive ? 'is-active' : ''} ${isConfigured ? 'is-configured' : ''}`}
        aria-pressed={isActive}
        data-testid={`bet-zone-${zone.toLowerCase()}`}
        onClick={() => onZoneActivate(zone)}
      >
        <span className="bet-zone-label">{label}</span>
        {isConfigured && (
          <span className="bet-zone-amount">${formatDecimal(amount)}</span>
        )}
      </button>
    );
  };

  return (
    <section className="workspace-panel bet-board-panel" aria-label="Strategy board">
      <div className="bet-board-toolbar">
        <div className="bet-board-actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            data-testid="select-across"
            onClick={() => onMacroSelect('ACROSS')}
          >
            Across
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            data-testid="select-inside"
            onClick={() => onMacroSelect('INSIDE')}
          >
            Inside
          </button>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger bet-board-clear"
          data-testid="clear-all-bets"
          onClick={onClearAllBets}
        >
          <BsTrash aria-hidden="true" />
          <span>Clear Bets</span>
        </button>
      </div>

      <div className="bet-board-numbers">
        {CRAPS_NUMBERS.map((number) => renderZoneButton(zoneForNumber(number), String(number)))}
      </div>

      <div className="bet-board-lines">
        {lineZones.map(({ zone, label }) => renderZoneButton(zone, label))}
      </div>
    </section>
  );
};
