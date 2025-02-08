import Form from 'react-bootstrap/Form';

export type BooleanSwitchInputProps = {
    id: string,
    label: string,
    helpText: string,
    value: boolean,
    onChange: (newValue: boolean) => void,
    disabled?: boolean,
};

const BooleanSwitchInput = ({ id, label, helpText, value, onChange, disabled }: BooleanSwitchInputProps): JSX.Element => {

    return (
        <>
            <div className='mb-0'>
                <Form.Check
                    type="switch"
                    id={id}
                    label={label}
                    checked={value}
                    onChange={(e) => { onChange(e.target.checked) }}
                    disabled={disabled}
                />
            </div>
            <div className='mb-0'>
                <small className="form-text text-muted" >
                    {helpText}
                </small>
            </div>
        </>
    );
};

export default BooleanSwitchInput;
