import { ReactNode } from 'react';

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: ReactNode;
};

type SegmentedControlProps<T extends string | number> = {
  ariaLabel: string;
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
};

const SegmentedControl = <T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>): JSX.Element => (
  <div className="segmented-control" role="group" aria-label={ariaLabel}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className={`btn btn-outline-primary${value === option.value ? ' active' : ''}`}
        aria-pressed={value === option.value}
        disabled={disabled}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;
