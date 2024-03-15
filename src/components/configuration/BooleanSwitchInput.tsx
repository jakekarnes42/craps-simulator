import Form from 'react-bootstrap/Form';

export type BooleanSwitchInputProps = {
    id: string,
    label: string,
    helpText: string,
    value: boolean
    onChange: (newValue: boolean) => void
};

const BooleanSwitchInput = ({ id, label, helpText, value, onChange }: BooleanSwitchInputProps): JSX.Element => {

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
                    {helpText}
                </small>
            </div>
        </>
    );
};

export default BooleanSwitchInput;
