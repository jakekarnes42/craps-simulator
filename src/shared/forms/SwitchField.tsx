import Form from 'react-bootstrap/Form';

export type SwitchFieldProps = {
    id: string;
    label: string;
    helpText: string;
    value: boolean;
    onChange: (newValue: boolean) => void;
    disabled?: boolean;
};

const SwitchField = ({ id, label, helpText, value, onChange, disabled }: SwitchFieldProps): JSX.Element => (
    <div className="compact-control switch-control">
        <div className="mb-0">
            <Form.Check
                type="switch"
                id={id}
                label={label}
                checked={value}
                onChange={(event) => onChange(event.target.checked)}
                disabled={disabled}
            />
        </div>
        <div className="mb-0">
            <small className="form-text text-muted">
                {helpText}
            </small>
        </div>
    </div>
);

export default SwitchField;
