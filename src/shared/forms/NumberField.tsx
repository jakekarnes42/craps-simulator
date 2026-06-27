import React from 'react';
import Form from 'react-bootstrap/Form';

export type NumberFieldProps = {
    id: string;
    label: string;
    placeholder?: string;
    value?: number | null;
    helpText: string | JSX.Element;
    isValid: boolean;
    invalidText: string;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    style?: React.CSSProperties;
    min?: number;
    step?: number;
};

const NumberField = ({ id, label, placeholder, value, helpText, isValid, invalidText, onChange, disabled, style, min, step }: NumberFieldProps): JSX.Element => (
    <Form.Group className="mb-3" controlId={id} style={style} >
        <Form.Label>{label}</Form.Label>
        <Form.Control
            type="number"
            placeholder={placeholder}
            value={value == null ? '' : value}
            isInvalid={!isValid}
            disabled={disabled}
            min={min}
            step={step}
            onChange={(e) => {
                const returnValue = e.currentTarget.value === "" ? null : Number(e.currentTarget.value);
                onChange(returnValue);
            }}
        />
        <Form.Control.Feedback type="invalid">
            {invalidText}
        </Form.Control.Feedback>
        <Form.Text className="text-muted">
            {helpText}
        </Form.Text>
    </Form.Group>
);

export default NumberField;
