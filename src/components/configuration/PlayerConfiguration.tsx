import { Dispatch, SetStateAction } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import { Configuration } from '../../game/Configuration';
import { rollsToReadableDuration, TableSpeed } from '../../util/Util';
import NumericInput from './NumericInput'

export type PlayerConfigurationProps = {
    eventKey: string,
    configuration: Configuration,
    setConfiguration: Dispatch<SetStateAction<Configuration>>
};

const PlayerConfiguration = ({ eventKey, configuration, setConfiguration }: PlayerConfigurationProps): JSX.Element => {

    return (
        <Accordion.Item eventKey={eventKey}>
            <Accordion.Header>Player Configuration</Accordion.Header>
            <Accordion.Body>
                <div className="configuration-warning">Caution: These settings greatly influence how long the simulations take. Very large values here may result in very long simulations because it takes a longer time to hit one of the configured limits or go bust.</div>
                <NumericInput
                    controlId='initialBankroll'
                    label="Initial Bankroll"
                    value={configuration.initialBankroll}
                    helpText={"The player's initial starting amount of money brought to the table."}
                    isValid={configuration.isInitialBankrollValid()}
                    invalidText='Must be a numeric value greater than 0.'
                    handleChange={(newValue: number | null) => {
                        if (newValue != null && newValue <= 0) {
                            newValue = 1;
                        }
                        setConfiguration(configuration.setInitialBankroll(newValue));
                    }}
                />
                <NumericInput
                    controlId='bankrollMinimum'
                    label="Bankroll Minimum"
                    value={configuration.bankrollMinimum}
                    helpText={"The player won't place bets that would drop their bankroll below this amount. Bets in-play will still be resolved. This can be thought of as the lower limit that would cause the player to walk away, but they'll wait out any already placed bets. Enter no value (or 0) to play until the player busts or hit another limit."}
                    isValid={configuration.isBankrollMinimumValid()}
                    invalidText={`Must be a non-negative number less than "Initial Bankroll" (${configuration.initialBankroll}) or not set at all.`}
                    handleChange={(newValue: number | null) => {
                        if (newValue != null && newValue < 0) {
                            newValue = 0;
                        }
                        setConfiguration(configuration.setBankrollMinimum(newValue));
                    }}
                />
                <NumericInput
                    controlId='bankrollMaximum'
                    label='Bankroll Maximum'
                    value={configuration.bankrollMaximum}
                    helpText={"The player will stop placing bets if their bankroll reaches this amount. Bets in-play will still be resolved. This can be thought of as the upper limit that would cause the player to walk away, but they'll wait out any already placed bets. Enter no value to play until the player hits another limit."}
                    isValid={configuration.isBankrollMaximumValid()}
                    invalidText={`Must be a positive number greater than "Initial Bankroll" (${configuration.initialBankroll}) or not set at all.`}
                    handleChange={(newValue: number | null) => {
                        if (newValue != null && newValue <= 0) {
                            newValue = 1;
                        }
                        setConfiguration(configuration.setBankrollMaximum(newValue));
                    }}
                />
                <NumericInput
                    controlId='maximumRolls'
                    label="Maximum Rolls"
                    value={configuration.maximumRolls}
                    helpText={"The player will stop placing bets after the configured number of rolls. Bets in-play will still be resolved. This essentilly indicates how long the player is willing to play, but they'll wait out any already placed bets. Enter no value to play until the player hits another limit."}
                    isValid={configuration.isMaximumRollsValid()}
                    invalidText={"Must be a number greater than 0 or not set at all."}
                    handleChange={(newValue: number | null) => {
                        if (newValue != null && newValue < 1) {
                            newValue = 1;
                        }
                        setConfiguration(configuration.setMaximumRolls(newValue));
                    }}
                />
                <small className="text-muted">
                    <ul>
                        <li><b>Slow table:</b> Approx. {rollsToReadableDuration(configuration.maximumRolls, TableSpeed.Slow)}.</li>
                        <li><b>Average table:</b> Approx. {rollsToReadableDuration(configuration.maximumRolls, TableSpeed.Average)}.</li>
                        <li><b>Fast table:</b> Approx. {rollsToReadableDuration(configuration.maximumRolls, TableSpeed.Fast)}.</li>
                    </ul>
                </small>

            </Accordion.Body>
        </Accordion.Item>
    );
};

export default PlayerConfiguration;
