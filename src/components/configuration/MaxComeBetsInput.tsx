import { ButtonGroup } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';

export type MaxComeBetsInputProps = {
    id: string,
    label: string,
    controllingBetValue: number | null
    maxBets: number
    onChange: (newMaxBets: number) => void
};

const MaxComeBetsInput = ({ id, label, controllingBetValue, maxBets, onChange }: MaxComeBetsInputProps): JSX.Element => {

    const isDisabled = controllingBetValue === null;

    let additionalContextElement: JSX.Element;
    if (isDisabled) {
        additionalContextElement = (<small className="form-text text-muted" >
            Provide a {label.toLocaleLowerCase()} bet value to enable this configuration.
        </small>);
    } else {
        additionalContextElement = (<small className="form-text text-muted" >
            {maxBets > 1 ? "Up to" : "Only"} {maxBets} {label.toLocaleLowerCase()} {maxBets > 1 ? "bets" : "bet"} will be placed whenever the point is on.
        </small>);
    }

    return (
        <>
            <div className='mb-0'>
                <Form.Label htmlFor={`${id}-buttongroup`}>{`Maximum Simultaneous ${label} Bets`}</Form.Label>
            </div>
            <div className='mb-0'>
                <ButtonGroup id={`${id}-buttongroup`}>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && maxBets === 1} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(1) }}>1</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && maxBets === 2} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(2) }}>2</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && maxBets === 3} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(3) }}>3</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && maxBets === 4} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(4) }}>4</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && maxBets === 5} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(5) }}>5</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && maxBets === 6} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(6) }}>6</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && maxBets === 7} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(7) }}>7</Form.Check.Label>
                </ButtonGroup>
            </div>
            <div className='mb-3'>
                {additionalContextElement}
            </div>
        </>
    );
};

export default MaxComeBetsInput;
