import { ButtonGroup } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { PressStrategy, PressStrategyType } from '../../game/PressStrategy';
import NumericInput from './NumericInput';

export type PressStrategyInputProps = {
  id: string;
  label: string;
  strategy: PressStrategy;
  onChange: (newStrategy: PressStrategy) => void;
  disabled?: boolean;
};

const PressStrategyInput = ({
  id,
  label,
  strategy,
  onChange,
  disabled = false,
}: PressStrategyInputProps): JSX.Element => {
  // Define help text for each press strategy.
  const strategyHelpText: Record<PressStrategyType, string> = {
    [PressStrategyType.NO_PRESS]:
      "No additional bet is pressed. All winnings return to the bankroll.",
    [PressStrategyType.PRESS_UNTIL]:
      "Keep pressing the bet until it reaches the target amount. Winnings above that target are collected into the bankroll.",
    [PressStrategyType.HALF_PRESS]:
      "Half of the winnings are reinvested into the bet, while the other half is returned to the bankroll.",
    [PressStrategyType.FULL_PRESS]:
      "All winnings are reinvested into the bet, increasing the wager for future rolls.",
    [PressStrategyType.POWER_PRESS]:
      "Winnings are reinvested up to the next optimal multiple, maximizing the wager without causing rounding issues.",
  };

  const additionalContextElement = disabled ? (
    <small className="form-text text-muted">
      There can be no press strategy without a number bet.
    </small>
  ) : (
    <div className="mb-3">
      <small className="form-text text-muted">
        Select how winnings from number bets are reinvested.
      </small>
      <div className="mt-2">
        <ul className="list-unstyled mb-0">
          <li>
            <strong>No Press:</strong> {strategyHelpText[PressStrategyType.NO_PRESS]}
          </li>
          <li>
            <strong>Press Until Amount:</strong> {strategyHelpText[PressStrategyType.PRESS_UNTIL]}
          </li>
          <li>
            <strong>Half Press:</strong> {strategyHelpText[PressStrategyType.HALF_PRESS]}
          </li>
          <li>
            <strong>Full Press:</strong> {strategyHelpText[PressStrategyType.FULL_PRESS]}
          </li>
          <li>
            <strong>Power Press:</strong> {strategyHelpText[PressStrategyType.POWER_PRESS]}
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-0">
        <Form.Label htmlFor={`${id}-buttongroup`}>{label}</Form.Label>
      </div>
      <div className="mb-0">
        <ButtonGroup id={`${id}-buttongroup`}>
          <Form.Check.Input
            type="radio"
            bsPrefix="btn-check"
            checked={strategy.type === PressStrategyType.NO_PRESS}
            readOnly
            disabled={disabled}
          />
          <Form.Check.Label
            bsPrefix="btn btn-outline-primary"
            onClick={() => {
              if (!disabled)
                onChange({ type: PressStrategyType.NO_PRESS, value: strategy.value });
            }}
          >
            No Press
          </Form.Check.Label>

          <Form.Check.Input
            type="radio"
            bsPrefix="btn-check"
            checked={strategy.type === PressStrategyType.PRESS_UNTIL}
            readOnly
            disabled={disabled}
          />
          <Form.Check.Label
            bsPrefix="btn btn-outline-primary"
            onClick={() => {
              if (!disabled)
                onChange({ type: PressStrategyType.PRESS_UNTIL, value: strategy.value });
            }}
          >
            Press Until Amount
          </Form.Check.Label>

          <Form.Check.Input
            type="radio"
            bsPrefix="btn-check"
            checked={strategy.type === PressStrategyType.HALF_PRESS}
            readOnly
            disabled={disabled}
          />
          <Form.Check.Label
            bsPrefix="btn btn-outline-primary"
            onClick={() => {
              if (!disabled)
                onChange({ type: PressStrategyType.HALF_PRESS, value: strategy.value });
            }}
          >
            Half Press
          </Form.Check.Label>

          <Form.Check.Input
            type="radio"
            bsPrefix="btn-check"
            checked={strategy.type === PressStrategyType.FULL_PRESS}
            readOnly
            disabled={disabled}
          />
          <Form.Check.Label
            bsPrefix="btn btn-outline-primary"
            onClick={() => {
              if (!disabled)
                onChange({ type: PressStrategyType.FULL_PRESS, value: strategy.value });
            }}
          >
            Full Press
          </Form.Check.Label>

          <Form.Check.Input
            type="radio"
            bsPrefix="btn-check"
            checked={strategy.type === PressStrategyType.POWER_PRESS}
            readOnly
            disabled={disabled}
          />
          <Form.Check.Label
            bsPrefix="btn btn-outline-primary"
            onClick={() => {
              if (!disabled)
                onChange({ type: PressStrategyType.POWER_PRESS, value: strategy.value });
            }}
          >
            Power Press
          </Form.Check.Label>
        </ButtonGroup>
      </div>
      {additionalContextElement}
      {strategy.type === PressStrategyType.PRESS_UNTIL && (
        <NumericInput
          controlId={`${id}-pressUntilAmount`}
          label="Target Press Amount"
          value={strategy.value}
          helpText="Enter the target amount to press the bet up to. Winnings beyond this target are collected into the bankroll."
          isValid={strategy.value > 0}
          invalidText="Must be a numeric value greater than 0."
          handleChange={(newValue: number | null) => {
            if (newValue == null || newValue <= 0) {
              newValue = 1;
            }
            onChange({ type: PressStrategyType.PRESS_UNTIL, value: newValue });
          }}
          style={{ marginLeft: '1rem' }}
        />
      )}
    </>
  );
};

export default PressStrategyInput;
