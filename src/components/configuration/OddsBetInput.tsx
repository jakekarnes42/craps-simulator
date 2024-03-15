import { ButtonGroup } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import NumericInput from './NumericInput';
import { OddsBetStrategy, OddsBetStrategyType } from '../../game/OddsBetStrategy';
import { RoundingType } from '../../game/RoundingType';
import { calculateOddsBetAmountAvoidRounding, convertToTwoDecimalPlaceString, round } from '../../util/Util';

export type OddsBetInputProps = {
    id: string,
    label: string,
    controllingBetValue: number | null,
    avoidRounding: boolean,
    rounding: RoundingType,
    strategy: OddsBetStrategy,
    onChange: (newStrategy: OddsBetStrategy) => void,
    dont: boolean
};

const OddsBetInput = ({ id, label, controllingBetValue, avoidRounding, rounding, strategy, onChange, dont }: OddsBetInputProps): JSX.Element => {
    const isDisabled = controllingBetValue == null;

    let additionalContextElement: JSX.Element;
    if (isDisabled) {
        additionalContextElement = (<small className="form-text text-muted" >
            There can be no odds bet without an original bet.
        </small>);
    } else {
        switch (strategy.type) {
            case OddsBetStrategyType.NONE:
                additionalContextElement = (<small className="form-text text-muted" >
                    No additional {label.toLocaleLowerCase()} odds bet will be placed.
                </small>);
                break;
            case OddsBetStrategyType.SETAMOUNT:
                let setAmountHelpText: string | JSX.Element;
                if (avoidRounding) {
                    setAmountHelpText = (
                        <>
                            <p className='mb-0'>The odds bet may vary slightly to avoid rounding.  Based on the current {label.toLocaleLowerCase()} bet value of ${controllingBetValue}, the player will make the following {label.toLocaleLowerCase()} odds bets:</p>
                            <ul>
                                <li>If the point is 4 or 10, bet ${calculateOddsBetAmountAvoidRounding(strategy.value, dont, 4)}</li>
                                <li>If the point is 5 or 9, bet ${calculateOddsBetAmountAvoidRounding(strategy.value, dont, 5)}</li>
                                <li>If the point is 6 or 8, bet ${calculateOddsBetAmountAvoidRounding(strategy.value, dont, 6)}</li>
                            </ul>
                        </>
                    );
                } else {
                    const roundedAmount = round(strategy.value, rounding);
                    const roundedAmountText = rounding === RoundingType.CENT ? convertToTwoDecimalPlaceString(roundedAmount) : roundedAmount;
                    setAmountHelpText = `The player will bet the following amount for each ${label.toLocaleLowerCase()} odds bet: $${roundedAmountText}.`;
                }

                additionalContextElement = (
                    <NumericInput
                        controlId={`${id}-amount`}
                        label={`${label} Odds Bet Amount`}
                        value={strategy.value}
                        helpText={setAmountHelpText}
                        isValid={strategy.value > 0}
                        invalidText='Must be a numeric value greater than 0.'
                        handleChange={(newValue: number | null) => {
                            if (newValue == null || newValue <= 0) {
                                newValue = 1;
                            }
                            onChange({ type: OddsBetStrategyType.SETAMOUNT, value: newValue })
                        }}
                        style={{ marginLeft: '1rem' }}
                    />
                );
                break;
            case OddsBetStrategyType.MULTIPLIER:
                const desiredBet = strategy.value * controllingBetValue;
                let multiplierHelpText: string | JSX.Element;
                if (avoidRounding) {
                    multiplierHelpText = (
                        <>
                            <p className='mb-0'>The odds bet may vary slightly to avoid rounding. Based on the current {label.toLocaleLowerCase()} bet value of ${controllingBetValue}, the player will make the following {label.toLocaleLowerCase()} odds bets:</p>
                            <ul>
                                <li>If the point is 4 or 10, bet ${calculateOddsBetAmountAvoidRounding(desiredBet, dont, 4)}</li>
                                <li>If the point is 5 or 9, bet ${calculateOddsBetAmountAvoidRounding(desiredBet, dont, 5)}</li>
                                <li>If the point is 6 or 8, bet ${calculateOddsBetAmountAvoidRounding(desiredBet, dont, 6)}</li>
                            </ul>
                        </>
                    );
                } else {
                    const roundedAmount = round(desiredBet, rounding);
                    const roundedAmountText = rounding === RoundingType.CENT ? convertToTwoDecimalPlaceString(roundedAmount) : roundedAmount;
                    multiplierHelpText = `The player will multiply the current ${label.toLocaleLowerCase()} bet of $${controllingBetValue} by ${strategy.value} when placing ${label.toLocaleLowerCase()} odds bet. The maximum ${label.toLocaleLowerCase()} odds bet will be: $${roundedAmountText}`;
                }

                additionalContextElement = (
                    <NumericInput
                        controlId={`${id}-multiplier`}
                        label={`${label} Odds Bet Multiplier`}
                        value={strategy.value}
                        helpText={multiplierHelpText}
                        isValid={strategy.value > 0}
                        invalidText='Must be a numeric value greater than 0.'
                        handleChange={(newValue: number | null) => {
                            if (newValue == null || newValue <= 0) {
                                newValue = 1;
                            }
                            onChange({ type: OddsBetStrategyType.MULTIPLIER, value: newValue })
                        }}
                        style={{ marginLeft: '1rem' }}
                    />
                );
                break;
            case OddsBetStrategyType.TABLEMAX:
                if (!dont) {
                    additionalContextElement = (<small className="form-text text-muted" >
                        <p className='mb-0'>The odds bet will be the maximum allowed by 3-4-5X rules.  Based on the current {label.toLocaleLowerCase()} bet value of ${controllingBetValue}, the player will make the following {label.toLocaleLowerCase()} odds bets:</p>
                        <ul>
                            <li>If the point is 4 or 10, bet 3 times the {label.toLocaleLowerCase()} bet: ${3 * controllingBetValue}</li>
                            <li>If the point is 5 or 9, bet 4 times the {label.toLocaleLowerCase()} bet: ${4 * controllingBetValue}</li>
                            <li>If the point is 6 or 8, bet 5 times the {label.toLocaleLowerCase()} bet: ${5 * controllingBetValue}</li>
                        </ul>
                    </small>);
                } else {
                    additionalContextElement = (<small className="form-text text-muted" >
                        <p className='mb-0'>The odds bet will be the maximum allowed by 3-4-5X rules. For "don't" bets, this is a 6x multiplier. Based on the current {label.toLocaleLowerCase()} bet value of ${controllingBetValue}, the maximum {label.toLocaleLowerCase()} odds bet will be: ${controllingBetValue * 6}</p>
                    </small>);
                }
                break;
        }
    }

    return (
        <>
            <div className='mb-0'>
                <Form.Label htmlFor={`${id}-buttongroup`}>{`${label} Odds Bet`}</Form.Label>
            </div>
            <div className='mb-0'>
                <ButtonGroup id={`${id}-buttongroup`}>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && strategy.type === OddsBetStrategyType.NONE} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange({ type: OddsBetStrategyType.NONE, value: strategy.value }) }}>{OddsBetStrategyType.NONE}</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && strategy.type === OddsBetStrategyType.SETAMOUNT} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange({ type: OddsBetStrategyType.SETAMOUNT, value: strategy.value }) }}>{OddsBetStrategyType.SETAMOUNT}</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && strategy.type === OddsBetStrategyType.MULTIPLIER} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange({ type: OddsBetStrategyType.MULTIPLIER, value: strategy.value }) }}>{OddsBetStrategyType.MULTIPLIER}</Form.Check.Label>
                    <Form.Check.Input type='radio' bsPrefix='btn-check' disabled={isDisabled} checked={!isDisabled && strategy.type === OddsBetStrategyType.TABLEMAX} readOnly />
                    <Form.Check.Label bsPrefix='btn btn-outline-primary' onClick={(e) => { onChange({ type: OddsBetStrategyType.TABLEMAX, value: strategy.value }) }}>{OddsBetStrategyType.TABLEMAX}</Form.Check.Label>
                </ButtonGroup>
            </div>
            <div className='mb-0'>
                {additionalContextElement}
            </div>
        </>
    );
};

export default OddsBetInput;
