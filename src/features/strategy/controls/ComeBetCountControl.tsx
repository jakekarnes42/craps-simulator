import SegmentedControl from '../../../shared/forms/SegmentedControl';

export type ComeBetCountControlProps = {
    id: string;
    label: string;
    controllingBetValue: number | null;
    maxBets: number;
    onChange: (newMaxBets: number) => void;
};

const ComeBetCountControl = ({ id, label, controllingBetValue, maxBets, onChange }: ComeBetCountControlProps): JSX.Element => {
    const isDisabled = controllingBetValue === null;
    const options = [1, 2, 3, 4, 5, 6, 7].map((value) => ({ value, label: value }));
    const contextText = isDisabled
        ? `Provide a ${label.toLocaleLowerCase()} bet value to enable this configuration.`
        : `${maxBets > 1 ? "Up to" : "Only"} ${maxBets} ${label.toLocaleLowerCase()} ${maxBets > 1 ? "bets" : "bet"} will be placed whenever the point is on.`;

    return (
        <div className="compact-control max-come-bets-control">
            <div className="mb-0">
                <div className="form-label">{`Maximum Simultaneous ${label} Bets`}</div>
            </div>
            <div className="mb-0" id={`${id}-buttongroup`}>
                <SegmentedControl
                    ariaLabel={`Maximum simultaneous ${label} bets`}
                    options={options}
                    value={isDisabled ? null : maxBets}
                    onChange={onChange}
                    disabled={isDisabled}
                />
            </div>
            <div className="mb-3">
                <small className="form-text text-muted">
                    {contextText}
                </small>
            </div>
        </div>
    );
};

export default ComeBetCountControl;
