import { floorToPrecision, TablePrecision } from '../../../engine/Money';
import { calculateOddsBetAmountAvoidRounding } from '../../../engine/OddsBets';
import { OddsBetStrategy, OddsBetStrategyType } from '../../../engine/Strategies';
import NumberField from '../../../shared/forms/NumberField';
import SegmentedControl from '../../../shared/forms/SegmentedControl';
import { formatDecimal } from '../../../shared/format';

export type OddsStrategyControlProps = {
    id: string;
    label: string;
    controllingBetValue: number | null;
    avoidRounding: boolean;
    precision: TablePrecision;
    strategy: OddsBetStrategy;
    onChange: (newStrategy: OddsBetStrategy) => void;
    dont: boolean;
};

const strategyLabels: Record<OddsBetStrategyType, string> = {
    [OddsBetStrategyType.NONE]: 'None',
    [OddsBetStrategyType.SETAMOUNT]: 'Amount',
    [OddsBetStrategyType.MULTIPLIER]: 'Multiplier',
    [OddsBetStrategyType.TABLEMAX]: 'Max Odds',
};

const strategyOptions = Object.values(OddsBetStrategyType).map((value) => ({
    value,
    label: strategyLabels[value],
}));

const pointGroups = [
    { label: '4 or 10', point: 4 },
    { label: '5 or 9', point: 5 },
    { label: '6 or 8', point: 6 },
];

const normalizePositive = (value: number | null) => value === null || value <= 0 ? 1 : value;

const formatMoney = (amount: number, precision: TablePrecision): string => (
    precision === TablePrecision.CENT ? amount.toFixed(2) : formatDecimal(amount)
);

const renderPointAmounts = (plannedBet: number, dont: boolean): string => (
    pointGroups
        .map(({ label: pointLabel, point }) => `${pointLabel}: $${calculateOddsBetAmountAvoidRounding(plannedBet, dont, point)}`)
        .join(' | ')
);

const OddsStrategyControl = ({ id, label, controllingBetValue, avoidRounding, precision, strategy, onChange, dont }: OddsStrategyControlProps): JSX.Element => {
    const isDisabled = controllingBetValue === null;
    const betLabel = label.toLocaleLowerCase();

    let additionalContextElement: JSX.Element | null = null;
    if (isDisabled) {
        additionalContextElement = (
            <small className="form-text text-muted">
                Add a base bet to enable odds.
            </small>
        );
    } else {
        switch (strategy.type) {
            case OddsBetStrategyType.NONE:
                additionalContextElement = null;
                break;
            case OddsBetStrategyType.SETAMOUNT: {
                const roundedAmount = floorToPrecision(strategy.amount, precision);
                const helpText = avoidRounding
                    ? renderPointAmounts(strategy.amount, dont)
                    : `$${formatMoney(roundedAmount, precision)} ${betLabel} odds.`;

                additionalContextElement = (
                    <NumberField
                        id={`${id}-amount`}
                        label="Odds Amount"
                        value={strategy.amount}
                        helpText={helpText}
                        isValid={strategy.amount > 0}
                        invalidText="Must be a numeric value greater than 0."
                        onChange={(newValue) => onChange({ type: OddsBetStrategyType.SETAMOUNT, amount: normalizePositive(newValue) })}
                    />
                );
                break;
            }
            case OddsBetStrategyType.MULTIPLIER: {
                const desiredBet = strategy.multiplier * controllingBetValue;
                const roundedAmount = floorToPrecision(desiredBet, precision);
                const helpText = avoidRounding
                    ? renderPointAmounts(desiredBet, dont)
                    : `${strategy.multiplier}x ${betLabel}: $${formatMoney(roundedAmount, precision)}.`;

                additionalContextElement = (
                    <NumberField
                        id={`${id}-multiplier`}
                        label="Odds Multiplier"
                        value={strategy.multiplier}
                        helpText={helpText}
                        isValid={strategy.multiplier > 0}
                        invalidText="Must be a numeric value greater than 0."
                        onChange={(newValue) => onChange({ type: OddsBetStrategyType.MULTIPLIER, multiplier: normalizePositive(newValue) })}
                    />
                );
                break;
            }
            case OddsBetStrategyType.TABLEMAX:
                additionalContextElement = (
                    <small className="form-text text-muted">
                        {dont
                            ? `6x odds: $${controllingBetValue * 6}.`
                            : `3-4-5x odds: 4/10 $${3 * controllingBetValue}, 5/9 $${4 * controllingBetValue}, 6/8 $${5 * controllingBetValue}.`}
                    </small>
                );
                break;
        }
    }

    return (
        <div className="compact-control">
            <div className="mb-0">
                <div className="form-label">{`${label} Odds`}</div>
            </div>
            <div className="mb-0" id={`${id}-buttongroup`}>
                <SegmentedControl
                    ariaLabel={`${label} odds`}
                    options={strategyOptions}
                    value={isDisabled ? null : strategy.type}
                    disabled={isDisabled}
                    onChange={(option) => {
                        if (option === OddsBetStrategyType.SETAMOUNT) {
                            onChange({
                                type: option,
                                amount: strategy.type === OddsBetStrategyType.SETAMOUNT ? strategy.amount : 1,
                            });
                        } else if (option === OddsBetStrategyType.MULTIPLIER) {
                            onChange({
                                type: option,
                                multiplier: strategy.type === OddsBetStrategyType.MULTIPLIER ? strategy.multiplier : 1,
                            });
                        } else {
                            onChange({ type: option });
                        }
                    }}
                />
            </div>
            <div className="mb-0">
                {additionalContextElement}
            </div>
        </div>
    );
};

export default OddsStrategyControl;
