import React from 'react';
import Form from 'react-bootstrap/Form';

export type BooleanSwitchInputProps = {
    id: string,
    label: string,
    value: boolean
    onChange: (newValue: boolean) => void
};

const BooleanSwitchInput = ({ id, label, value, onChange }: BooleanSwitchInputProps): JSX.Element => {

    return (
        <>
            <div className='mb-0'>
                <Form.Check
                    type="switch"
                    id={id}
                    label={label}
                    checked={value}
                    onChange={(e) => { onChange(e.target.checked) }}
                />
            </div>
            <div className='mb-0'>
                <small className="form-text text-muted" >
                    This setting configures whether bets are increased to avoid rounding losses.
                </small>
            </div>
        </>
    );
};

export default BooleanSwitchInput;
