import { Dispatch, SetStateAction } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import RoundingInput from './RoundingInput';
import { RoundingType } from "../../game/RoundingType";
import { Configuration } from '../../game/Configuration';
import NumericInput from './NumericInput';
import { Form } from 'react-bootstrap';
import BooleanSwitchInput from './BooleanSwitchInput';

export type GameConfigurationProps = {
    eventKey: string,
    configuration: Configuration,
    setConfiguration: Dispatch<SetStateAction<Configuration>>
};

const GameConfiguration = ({ eventKey, configuration, setConfiguration }: GameConfigurationProps): JSX.Element => {

    return (
        <Accordion.Item eventKey={eventKey}>
            <Accordion.Header>Game Configuration</Accordion.Header>
            <Accordion.Body>
                <BooleanSwitchInput
                    id="avoidRoundingInput"
                    label="Increase Bet to Avoid Rounding"
                    value={configuration.avoidRounding}
                    onChange={(newValue: boolean) => {
                        setConfiguration(configuration.setAvoidRounding(newValue));
                    }}
                />
                <RoundingInput
                    id="roundingInput"
                    label="Rounding"
                    enabled={!configuration.avoidRounding}
                    rounding={configuration.rounding}
                    onChange={(newValue: RoundingType) => {
                        setConfiguration(configuration.setRounding(newValue));
                    }}
                />
                <NumericInput
                    controlId='simulationCount'
                    label="Number of Simulated Games"
                    value={configuration.simulationCount}
                    helpText={"This is the number of games that will be simulated during bulk simulation."}
                    isValid={configuration.isSimulationCountValid()}
                    invalidText='Must be a numeric value greater than 0.'
                    handleChange={(newValue: number | null) => {
                        if (newValue != null && newValue <= 0) {
                            newValue = 1;
                        }
                        setConfiguration(configuration.setSimulationCount(newValue));
                    }}
                />
            </Accordion.Body>
        </Accordion.Item>

    );
};

export default GameConfiguration;
