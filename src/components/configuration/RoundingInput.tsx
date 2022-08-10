import {  ButtonGroup} from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { RoundingType } from '../../game/RoundingType';

export type RoundingInputProps = {
    id: string,
    label: string,
    rounding: RoundingType
    onChange: (newRounding: RoundingType) => void
};

const RoundingInput = ({ id, label, rounding, onChange }: RoundingInputProps): JSX.Element => {

    return (
        <>
            <div className='mb-0'>
                <Form.Label htmlFor={`${id}-buttongroup`}>{label}</Form.Label>
            </div>
            <div className='mb-0'>
                <ButtonGroup id={`${id}-buttongroup`}>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' checked={rounding === RoundingType.DOLLAR} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(RoundingType.DOLLAR) }}>{RoundingType.DOLLAR}</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' checked={rounding === RoundingType.CENT} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange(RoundingType.CENT) }}>{RoundingType.CENT}</Form.Check.Label>
                </ButtonGroup>
            </div>
            <div className='mb-0'>
                <small className="form-text text-muted" >
                    This setting configures whether values are rounded to the nearest dollar or cent.
                </small>
            </div>
        </>
    );
};

export default RoundingInput;
