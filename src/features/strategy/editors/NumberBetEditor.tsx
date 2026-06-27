import React, { Dispatch, SetStateAction } from 'react';
import Form from 'react-bootstrap/Form';
import { Configuration } from '../../../engine/Configuration';
import { CRAPS_NUMBERS, CrapsNumber } from '../../../engine/NumberBets';
import { PressStrategy, PressStrategyType } from '../../../engine/Strategies';
import { formatDecimal } from '../../../shared/format';
import PressStrategyControl from '../controls/PressStrategyControl';
import { allocateNumberBetTotal, NumberBetAllocation } from '../numberBetAllocation';

type NumberBetEditorProps = {
  selectedNumbers: CrapsNumber[];
  onSelectedNumbersChange: (numbers: CrapsNumber[]) => void;
  configuration: Configuration;
  setConfiguration: Dispatch<SetStateAction<Configuration>>;
};

type AllocationFeedback = {
  message: string;
  tone: 'attention' | 'complete';
};

const pressOptions = [
  PressStrategyType.NO_PRESS,
  PressStrategyType.PRESS_UNTIL,
  PressStrategyType.HALF_PRESS,
  PressStrategyType.FULL_PRESS,
  PressStrategyType.POWER_PRESS,
];

const formatNumberList = (numbers: CrapsNumber[]): string => {
  if (numbers.length <= 1) return numbers.join('');
  if (numbers.length === 2) return `${numbers[0]} and ${numbers[1]}`;

  const head = numbers.slice(0, -1).join(', ');
  return `${head}, and ${numbers[numbers.length - 1]}`;
};

const formatAllocationFeedback = ({
  allocatedTotal,
  minimumCompleteTotal,
  remainder,
  skippedNumbers,
}: NumberBetAllocation): AllocationFeedback => {
  let message = `$${formatDecimal(allocatedTotal)} allocated`;

  if (remainder > 0) {
    message += `; $${formatDecimal(remainder)} left over`;
  }

  message += '.';

  if (skippedNumbers.length > 0) {
    message += ` No amount was assigned to ${formatNumberList(skippedNumbers)}.`;
    if (minimumCompleteTotal > 0) {
      message += ` $${formatDecimal(minimumCompleteTotal)} covers all selected in clean units.`;
    }
  }

  return {
    message,
    tone: remainder > 0 || skippedNumbers.length > 0 ? 'attention' : 'complete',
  };
};

const normalizePositive = (value: string): number | null => {
  if (value.trim() === '') return null;
  const numericValue = Number(value);
  return Number.isNaN(numericValue) || numericValue <= 0 ? null : numericValue;
};

const toggleNumber = (numbers: CrapsNumber[], number: CrapsNumber): CrapsNumber[] => {
  if (numbers.includes(number)) {
    return numbers.filter((selectedNumber) => selectedNumber !== number);
  }
  return [...numbers, number].sort((a, b) => CRAPS_NUMBERS.indexOf(a) - CRAPS_NUMBERS.indexOf(b));
};

export const NumberBetEditor = ({
  selectedNumbers,
  onSelectedNumbersChange,
  configuration,
  setConfiguration,
}: NumberBetEditorProps): JSX.Element => {
  const [allocationFeedback, setAllocationFeedback] = React.useState<AllocationFeedback | null>(null);
  const selectedSet = new Set(selectedNumbers);
  const hasSelection = selectedNumbers.length > 0;

  React.useEffect(() => {
    setAllocationFeedback(null);
  }, [selectedNumbers, configuration.avoidRounding, configuration.tablePrecision]);

  const selectedNumberLabel = hasSelection ? selectedNumbers.join(', ') : 'None';

  const applyToSelected = (updater: (configuration: Configuration, number: CrapsNumber) => Configuration) => {
    if (!hasSelection) return;
    setConfiguration(selectedNumbers.reduce(updater, configuration));
  };

  const firstSelectedStrategy = (): PressStrategy => {
    const firstNumber = selectedNumbers[0];
    return firstNumber === undefined
      ? { type: PressStrategyType.NO_PRESS }
      : configuration.getPressStrategy(firstNumber);
  };

  const selectedPressStrategy = firstSelectedStrategy();
  const hasMixedPressStrategies = selectedNumbers.some((number) => {
    const strategy = configuration.getPressStrategy(number);
    if (strategy.type !== selectedPressStrategy.type) return true;
    return strategy.type === PressStrategyType.PRESS_UNTIL
      && selectedPressStrategy.type === PressStrategyType.PRESS_UNTIL
      && strategy.target !== selectedPressStrategy.target;
  });

  const applyAmountToSelected = (rawValue: string) => {
    setAllocationFeedback(null);
    const value = normalizePositive(rawValue);
    if (value === null) return;
    applyToSelected((config, number) => config.setNumberBet(number, value));
  };

  const allocateTotalToSelected = (rawValue: string) => {
    const totalInvestment = normalizePositive(rawValue);
    if (totalInvestment === null || !hasSelection) {
      setAllocationFeedback(null);
      return;
    }

    const allocation = allocateNumberBetTotal(
      totalInvestment,
      selectedNumbers,
      configuration.avoidRounding,
      configuration.tablePrecision
    );
    const { allocations } = allocation;

    applyToSelected((config, number) => {
      const amount = allocations[number];
      return config.setNumberBet(number, amount && amount > 0 ? amount : null);
    });

    setAllocationFeedback(formatAllocationFeedback(allocation));
  };

  const setNumberBet = (number: CrapsNumber, rawValue: string) => {
    const value = normalizePositive(rawValue);
    setConfiguration(configuration.setNumberBet(number, value));
  };

  const setPressStrategy = (number: CrapsNumber, strategy: PressStrategy) => {
    setConfiguration(configuration.setPressStrategy(number, strategy));
  };

  return (
    <section className="workspace-panel strategy-editor-panel" aria-label="Place numbers editor">
      <div className="panel-heading">
        <h2>Place Numbers</h2>
        <span className="panel-meta">{selectedNumbers.length} selected</span>
      </div>

      <div className="number-bulk-bar">
        <div className="selected-number-summary">
          <div>
            <span className="field-caption">Selected Numbers</span>
            <strong>{selectedNumberLabel}</strong>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onSelectedNumbersChange([])} disabled={!hasSelection}>
            Clear Selection
          </button>
        </div>

        <div className="bulk-section-label">Apply Amount to Selected</div>
        <div className="number-bulk-inputs">
          <Form.Group controlId="selected-number-total">
            <Form.Label>Total</Form.Label>
            <Form.Control
              type="number"
              size="sm"
              placeholder="Allocate"
              disabled={!hasSelection}
              data-testid="selected-number-total"
              onChange={(event) => allocateTotalToSelected(event.currentTarget.value)}
            />
          </Form.Group>
          <Form.Group controlId="selected-number-amount">
            <Form.Label>Each</Form.Label>
            <Form.Control
              type="number"
              size="sm"
              placeholder="Set"
              disabled={!hasSelection}
              data-testid="selected-number-each"
              onChange={(event) => applyAmountToSelected(event.currentTarget.value)}
            />
          </Form.Group>
        </div>
        {allocationFeedback && (
          <div className={`number-allocation-message is-${allocationFeedback.tone}`}>
            {allocationFeedback.message}
          </div>
        )}
      </div>

      <div className="number-press-bulk">
        <PressStrategyControl
          id="selected-number-press"
          label="Apply Press to Selected"
          strategy={selectedPressStrategy}
          mixed={hasMixedPressStrategies}
          disabled={!hasSelection}
          onChange={(strategy) => applyToSelected((config, number) => config.setPressStrategy(number, strategy))}
        />
      </div>

      <div className="number-bet-grid" role="table" aria-label="Number bets">
        <div className="number-bet-row number-bet-row-header" role="row">
          <span role="columnheader">Number</span>
          <span role="columnheader">Bet</span>
          <span role="columnheader">Effective</span>
          <span role="columnheader">Per-number Press</span>
        </div>
        {CRAPS_NUMBERS.map((number) => {
          const amount = configuration.getNumberBet(number);
          const effectiveAmount = configuration.effectiveNumberBet(number);
          const strategy = configuration.getPressStrategy(number);
          const isSelected = selectedSet.has(number);

          return (
            <div
              key={number}
              className={`number-bet-row ${isSelected ? 'is-selected' : ''}`}
              role="row"
              data-testid={`number-row-${number}`}
            >
              <button
                type="button"
                className="number-picker"
                aria-pressed={isSelected}
                onClick={() => onSelectedNumbersChange(toggleNumber(selectedNumbers, number))}
              >
                {number}
              </button>
              <Form.Control
                type="number"
                size="sm"
                value={amount ?? ''}
                data-testid={`number-bet-${number}`}
                aria-label={`Number ${number} bet`}
                onChange={(event) => setNumberBet(number, event.currentTarget.value)}
              />
              <span className="effective-amount">
                {effectiveAmount !== null ? `$${formatDecimal(effectiveAmount)}` : '-'}
              </span>
              <div className="number-press-cell">
                <Form.Select
                  size="sm"
                  value={strategy.type}
                  aria-label={`Number ${number} press strategy`}
                  onChange={(event) => {
                    const type = event.currentTarget.value as PressStrategyType;
                    setPressStrategy(number, type === PressStrategyType.PRESS_UNTIL
                      ? {
                          type,
                          target: strategy.type === PressStrategyType.PRESS_UNTIL ? strategy.target : 100,
                        }
                      : { type });
                  }}
                >
                  {pressOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Form.Select>
                {strategy.type === PressStrategyType.PRESS_UNTIL && (
                  <Form.Control
                    type="number"
                    size="sm"
                    value={strategy.target}
                    aria-label={`Number ${number} press target`}
                    onChange={(event) => {
                      const value = normalizePositive(event.currentTarget.value) ?? 1;
                      setPressStrategy(number, { type: PressStrategyType.PRESS_UNTIL, target: value });
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
