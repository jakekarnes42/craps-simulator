import React from 'react';
import Form from 'react-bootstrap/Form';

export type NumericInputProps = {
    controlId: string,
    label: string,
    placeholder?: string,
    value?: number | null
    helpText: string | JSX.Element,
    isValid: boolean,
    invalidText: string,
    handleChange: (val: number | null) => void
    style?: React.CSSProperties
};

const NumericInput = ({ controlId, label, placeholder, value, helpText, isValid, invalidText, handleChange, style }: NumericInputProps): JSX.Element => (
    <Form.Group className="mb-3" controlId={controlId} style={style} >
        <Form.Label>{label}</Form.Label>
        <Form.Control
            type="number"
            placeholder={placeholder}
            value={value == null ? '' : value}
            isInvalid={!isValid}
            onChange={(e) => {
                var returnValue: number | null;
                if (e.currentTarget.value === "") {
                    returnValue = null;
                } else {
                    returnValue = Number(e.currentTarget.value)
                }
                handleChange(returnValue);
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

export default NumericInput;
