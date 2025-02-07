import { Dispatch, SetStateAction } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import { Configuration } from '../../game/Configuration';
import { RoundingType } from "../../game/RoundingType";
import BooleanSwitchInput from './BooleanSwitchInput';
import NumericInput from './NumericInput';
import RoundingInput from './RoundingInput';

export type SimulationConfigurationProps = {
    eventKey: string,
    configuration: Configuration,
    setConfiguration: Dispatch<SetStateAction<Configuration>>
};

const SimulationConfiguration = ({ eventKey, configuration, setConfiguration }: SimulationConfigurationProps): JSX.Element => {

    return (
        <Accordion.Item eventKey={eventKey}>
            <Accordion.Header>Simulation Configuration</Accordion.Header>
            <Accordion.Body>
                <BooleanSwitchInput
                    id="avoidRoundingInput"
                    label="Increase Bet to Avoid Rounding"
                    helpText={"This setting configures whether bets are increased to avoid rounding losses."}
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

export default SimulationConfiguration;
