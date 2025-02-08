import { ButtonGroup } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { PressStrategy } from '../../game/PressStrategy';

export type PressStrategyInputProps = {
    id: string;
    label: string;
    value: PressStrategy;
    onChange: (newValue: PressStrategy) => void;
};

const PressStrategyInput = ({ id, label, value, onChange }: PressStrategyInputProps): JSX.Element => {
    return (
        <>
            <div className="mb-0">
                <Form.Label htmlFor={`${id}-buttongroup`}>{label}</Form.Label>
            </div>
            <div className="mb-0">
                <ButtonGroup id={`${id}-buttongroup`}>
                    <Form.Check.Input type="radio" bsPrefix="btn-check" checked={value === PressStrategy.NO_PRESS} readOnly />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => onChange(PressStrategy.NO_PRESS)}
                    >
                        No Press
                    </Form.Check.Label>

                    <Form.Check.Input type="radio" bsPrefix="btn-check" checked={value === PressStrategy.HALF_PRESS} readOnly />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => onChange(PressStrategy.HALF_PRESS)}
                    >
                        Half Press
                    </Form.Check.Label>

                    <Form.Check.Input type="radio" bsPrefix="btn-check" checked={value === PressStrategy.FULL_PRESS} readOnly />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => onChange(PressStrategy.FULL_PRESS)}
                    >
                        Full Press
                    </Form.Check.Label>

                    <Form.Check.Input type="radio" bsPrefix="btn-check" checked={value === PressStrategy.POWER_PRESS} readOnly />
                    <Form.Check.Label
                        bsPrefix="btn btn-outline-primary"
                        onClick={() => onChange(PressStrategy.POWER_PRESS)}
                    >
                        Power Press
                    </Form.Check.Label>
                </ButtonGroup>
            </div>
            <div className="mb-3">
                <small className="form-text text-muted">
                    Select how winnings are reinvested when a number bet wins.
                </small>
            </div>
        </>
    );
};

export default PressStrategyInput;
