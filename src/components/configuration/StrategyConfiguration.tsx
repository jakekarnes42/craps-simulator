import { Dispatch, SetStateAction } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import { Configuration } from '../../game/Configuration';
import { OddsBetStrategy } from "../../game/OddsBetStrategy";
import BooleanSwitchInput from './BooleanSwitchInput';
import MaxComeBetsInput from './MaxComeBetsInput';
import NumericInput from './NumericInput';
import OddsBetInput from './OddsBetInput';


export type StrategyConfigurationProps = {
    eventKey: string,
    configuration: Configuration,
    setConfiguration: Dispatch<SetStateAction<Configuration>>
};

const StrategyConfiguration = ({ eventKey, configuration, setConfiguration }: StrategyConfigurationProps): JSX.Element => {
    return (
        <Accordion.Item eventKey={eventKey}>
            <Accordion.Header className='bold-text'>Strategy Configuration</Accordion.Header>
            <Accordion.Body>
                <div className="mb-2">This section configures the player's betting strategy.</div>
                <Accordion.Item eventKey="passBet">
                    <Accordion.Header>Pass</Accordion.Header>
                    <Accordion.Body>
                        <NumericInput
                            controlId='passBet'
                            label="Pass Line Bet"
                            value={configuration.passBet}
                            helpText={"This is the player's pass line bet which will be played every new roll when the point is off."}
                            isValid
                            invalidText={`Must be a positive number or not set at all.`}
                            handleChange={(newValue: number | null) => {
                                if (newValue != null && newValue <= 0) {
                                    newValue = 1;
                                }
                                setConfiguration(configuration.setPassBet(newValue));
                            }}
                        />
                        <OddsBetInput
                            id='passBetOdds'
                            label='Pass'
                            controllingBetValue={configuration.passBet}
                            avoidRounding={configuration.avoidRounding}
                            rounding={configuration.rounding}
                            strategy={configuration.passBetOddsStrategy}
                            onChange={(newStrategy: OddsBetStrategy) => {
                                setConfiguration(configuration.setPassBetOddsStrategy(newStrategy));
                            }}
                            dont={false}
                        />
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="come">
                    <Accordion.Header>Come</Accordion.Header>
                    <Accordion.Body>
                        <NumericInput
                            controlId='comeBet'
                            label="Come Bet"
                            value={configuration.comeBet}
                            helpText={"This is the player's come bet amount. The bet will be placed according to the strategy configured below."}
                            isValid
                            invalidText={`Must be a positive number or not set at all.`}
                            handleChange={(newValue: number | null) => {
                                if (newValue != null && newValue <= 0) {
                                    newValue = 1;
                                }
                                setConfiguration(configuration.setComeBet(newValue));
                            }}
                        />
                        <MaxComeBetsInput
                            id='comeBetStrategy'
                            label='Come'
                            controllingBetValue={configuration.comeBet}
                            maxBets={configuration.maxComeBets}
                            onChange={(newValue: number) => {
                                setConfiguration(configuration.setMaxComeBets(newValue));
                            }}
                        />
                        <OddsBetInput
                            id='comeBetOdds'
                            label='Come'
                            controllingBetValue={configuration.comeBet}
                            avoidRounding={configuration.avoidRounding}
                            rounding={configuration.rounding}
                            strategy={configuration.comeBetOddsStrategy}
                            onChange={(newStrategy: OddsBetStrategy) => {
                                setConfiguration(configuration.setComeBetOddsStrategy(newStrategy));
                            }}
                            dont={false}
                        />
                        <BooleanSwitchInput
                            id="comeBetOddsWorkingComeOutInput"
                            label="Come Bet Odds Working During Come Out Roll"
                            helpText={"This setting configures whether come odds bets are working during the come out roll. By default, come bet odds are assumed to be off during the come out roll unless the player tells the dealer otherwise."}
                            value={configuration.comeBetOddsWorkingComeOut}
                            onChange={(newValue: boolean) => {
                                setConfiguration(configuration.setComeBetOddsWorkingComeOut(newValue));
                            }}
                        />
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="dontPassBet">
                    <Accordion.Header>Don't Pass</Accordion.Header>
                    <Accordion.Body>
                        <NumericInput
                            controlId='dontPassBet'
                            label="Don't Pass Bet"
                            value={configuration.dontPassBet}
                            helpText={"This is the player's don't pass bet which will be played every new roll when the point is off."}
                            isValid
                            invalidText={`Must be a positive number or not set at all.`}
                            handleChange={(newValue: number | null) => {
                                if (newValue != null && newValue <= 0) {
                                    newValue = 1;
                                }
                                setConfiguration(configuration.setDontPassBet(newValue));
                            }}
                        />
                        <OddsBetInput
                            id='dontPassBetOdds'
                            label="Don't Pass"
                            controllingBetValue={configuration.dontPassBet}
                            avoidRounding={configuration.avoidRounding}
                            rounding={configuration.rounding}
                            strategy={configuration.dontPassBetOddsStrategy}
                            onChange={(newStrategy: OddsBetStrategy) => {
                                setConfiguration(configuration.setDontPassBetOddsStrategy(newStrategy));
                            }}
                            dont
                        />
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="dontCome">
                    <Accordion.Header>Don't Come</Accordion.Header>
                    <Accordion.Body>
                        <NumericInput
                            controlId='dontComeBet'
                            label="Don't Come Bet"
                            value={configuration.dontComeBet}
                            helpText={"This is the player's don't come bet amount. The bet will be placed according to the strategy configured below."}
                            isValid
                            invalidText={`Must be a positive number or not set at all.`}
                            handleChange={(newValue: number | null) => {
                                if (newValue != null && newValue <= 0) {
                                    newValue = 1;
                                }
                                setConfiguration(configuration.setDontComeBet(newValue));
                            }}
                        />
                        <MaxComeBetsInput
                            id='dontComeBetStrategy'
                            label="Don't Come"
                            controllingBetValue={configuration.dontComeBet}
                            maxBets={configuration.maxDontComeBets}
                            onChange={(newValue: number) => {
                                setConfiguration(configuration.setMaxDontComeBets(newValue));
                            }}
                        />
                        <OddsBetInput
                            id='dontComeBetOdds'
                            label="Don't Come"
                            controllingBetValue={configuration.dontComeBet}
                            avoidRounding={configuration.avoidRounding}
                            rounding={configuration.rounding}
                            strategy={configuration.dontComeBetOddsStrategy}
                            onChange={(newStrategy: OddsBetStrategy) => {
                                setConfiguration(configuration.setDontComeBetOddsStrategy(newStrategy));
                            }}
                            dont
                        />
                        <BooleanSwitchInput
                            id="dontComeBetOddsWorkingComeOutInput"
                            label="Don't Come Bet Odds Working During Come Out Roll"
                            helpText={"This setting configures whether don't come odds bets are working during the come out roll. By default, don't come bet odds are assumed to be off during the come out roll unless the player tells the dealer otherwise."}
                            value={configuration.dontComeBetOddsWorkingComeOut}
                            onChange={(newValue: boolean) => {
                                setConfiguration(configuration.setDontComeBetOddsWorkingComeOut(newValue));
                            }}
                        />
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion.Body>
        </Accordion.Item>
    );
};

export default StrategyConfiguration;
