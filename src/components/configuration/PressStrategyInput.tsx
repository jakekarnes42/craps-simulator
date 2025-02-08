import { ButtonGroup } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { PressStrategy } from '../../game/PressStrategy';

export type PressStrategyInputProps = {
    id: string;
    label: string;
    value: PressStrategy;
    onChange: (newValue: PressStrategy) => void;
    disabled?: boolean;
};

const PressStrategyInput = ({
    id,
    label,
    value,
    onChange,
    disabled = false,
}: PressStrategyInputProps): JSX.Element => {
    // Define help text for each press strategy.
    const strategyHelpText: Record<PressStrategy, string> = {
        [PressStrategy.NO_PRESS]:
            "No additional bet is placed. All winnings are returned to the bankroll.",
        [PressStrategy.HALF_PRESS]:
            "Half of the winnings are reinvested, while the other half is returned to the bankroll.",
        [PressStrategy.FULL_PRESS]:
            "All winnings are reinvested, increasing the wager for future rolls.",
        [PressStrategy.POWER_PRESS]:
            "Winnings are reinvested up to the next optimal multiple, maximizing the wager without causing rounding issues.",
    };

    // Create an additional context element similar to the OddsBetInput component.
    const additionalContextElement = disabled ?
        (<small className="form-text text-muted">
            There can be no press strategy without a number bet.
        </small>)
        :
        (
            <div className="mb-3">
                <small className="form-text text-muted">
                    Select how winnings are reinvested when a number bet wins.
                </small>
                <div className="mt-2">
                    <ul className="list-unstyled mb-0">
                        <li>
                            <strong>No Press:</strong> {strategyHelpText[PressStrategy.NO_PRESS]}
                        </li>
                        <li>
                            <strong>Half Press:</strong>{' '}
                            {strategyHelpText[PressStrategy.HALF_PRESS]}
                        </li>
                        <li>
                            <strong>Full Press:</strong>{' '}
                            {strategyHelpText[PressStrategy.FULL_PRESS]}
                        </li>
                        <li>
                            <strong>Power Press:</strong>{' '}
                            {strategyHelpText[PressStrategy.POWER_PRESS]}
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
                        checked={value === PressStrategy.NO_PRESS}
                        readOnly
                        disabled={disabled}
                    />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => {
                            if (!disabled) onChange(PressStrategy.NO_PRESS);
                        }}
                    >
                        No Press
                    </Form.Check.Label>

                    <Form.Check.Input
                        type="radio"
                        bsPrefix="btn-check"
                        checked={value === PressStrategy.HALF_PRESS}
                        readOnly
                        disabled={disabled}
                    />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => {
                            if (!disabled) onChange(PressStrategy.HALF_PRESS);
                        }}
                    >
                        Half Press
                    </Form.Check.Label>

                    <Form.Check.Input
                        type="radio"
                        bsPrefix="btn-check"
                        checked={value === PressStrategy.FULL_PRESS}
                        readOnly
                        disabled={disabled}
                    />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => {
                            if (!disabled) onChange(PressStrategy.FULL_PRESS);
                        }}
                    >
                        Full Press
                    </Form.Check.Label>

                    <Form.Check.Input
                        type="radio"
                        bsPrefix="btn-check"
                        checked={value === PressStrategy.POWER_PRESS}
                        readOnly
                        disabled={disabled}
                    />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => {
                            if (!disabled) onChange(PressStrategy.POWER_PRESS);
                        }}
                    >
                        Power Press
                    </Form.Check.Label>
                </ButtonGroup>
            </div>
            {additionalContextElement}
        </>
    );
};

export default PressStrategyInput;
