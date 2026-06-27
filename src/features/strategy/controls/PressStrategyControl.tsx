import { PressStrategy, PressStrategyType } from '../../../engine/Strategies';
import NumberField from '../../../shared/forms/NumberField';
import SegmentedControl from '../../../shared/forms/SegmentedControl';

export type PressStrategyControlProps = {
  id: string;
  label: string;
  strategy: PressStrategy;
  onChange: (newStrategy: PressStrategy) => void;
  disabled?: boolean;
  mixed?: boolean;
};

const PressStrategyControl = ({
  id,
  label,
  strategy,
  onChange,
  disabled = false,
  mixed = false,
}: PressStrategyControlProps): JSX.Element => {
  const strategyHelpText: Record<PressStrategyType, string> = {
    [PressStrategyType.NO_PRESS]:
      "Collect winnings.",
    [PressStrategyType.PRESS_UNTIL]:
      "Press until the target is reached.",
    [PressStrategyType.HALF_PRESS]:
      "Press half of each win.",
    [PressStrategyType.FULL_PRESS]:
      "Press the full win.",
    [PressStrategyType.POWER_PRESS]:
      "Press to the next clean unit.",
  };
  const strategyLabels: Record<PressStrategyType, string> = {
    [PressStrategyType.NO_PRESS]: "No",
    [PressStrategyType.PRESS_UNTIL]: "Until",
    [PressStrategyType.HALF_PRESS]: "Half",
    [PressStrategyType.FULL_PRESS]: "Full",
    [PressStrategyType.POWER_PRESS]: "Power",
  };
  const strategyOptions = Object.values(PressStrategyType).map((value) => ({
    value,
    label: strategyLabels[value],
  }));

  const additionalContextElement = disabled ? (
    <small className="form-text text-muted">
      Select numbers to apply press settings.
    </small>
  ) : mixed ? (
    <small className="form-text text-muted">
      Mixed strategies selected. Choose one to apply it to all selected numbers.
    </small>
  ) : (
    <small className="form-text text-muted">{strategyHelpText[strategy.type]}</small>
  );

  return (
    <div className="compact-control">
      <div className="mb-0">
        <div className="form-label">{label}</div>
      </div>
      <div className="mb-0" id={`${id}-buttongroup`}>
        <SegmentedControl
          ariaLabel={label}
          options={strategyOptions}
          value={mixed ? null : strategy.type}
          disabled={disabled}
          onChange={(option) => onChange(option === PressStrategyType.PRESS_UNTIL
            ? {
                type: option,
                target: strategy.type === PressStrategyType.PRESS_UNTIL ? strategy.target : 100,
              }
            : { type: option })}
        />
      </div>
      {additionalContextElement}
      {!mixed && strategy.type === PressStrategyType.PRESS_UNTIL && (
        <NumberField
          id={`${id}-pressUntilAmount`}
          label="Target"
          value={strategy.target}
          helpText="Winnings above this target are collected."
          isValid={strategy.target > 0}
          invalidText="Must be a numeric value greater than 0."
          onChange={(newValue: number | null) => {
            if (newValue == null || newValue <= 0) {
              newValue = 1;
            }
            onChange({ type: PressStrategyType.PRESS_UNTIL, target: newValue });
          }}
        />
      )}
    </div>
  );
};

export default PressStrategyControl;
