import { Dispatch, SetStateAction } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import { Configuration } from '../../game/Configuration';
import { PressStrategyType } from '../../game/PressStrategy';
import { calculateNumberBetAvoidRounding } from '../../util/Util';
import BooleanSwitchInput from './BooleanSwitchInput';
import NumericInput from './NumericInput';
import PressStrategyInput from './PressStrategyInput';

type NumberBetsConfigurationProps = {
  eventKey: string;
  configuration: Configuration;
  setConfiguration: Dispatch<SetStateAction<Configuration>>;
};

export const NumberBetsConfiguration = ({
  eventKey,
  configuration,
  setConfiguration,
}: NumberBetsConfigurationProps): JSX.Element => {

  function getNumberBetHelpText(num: 4 | 5 | 6 | 8 | 9 | 10, userValue: number | null): JSX.Element | string {
    if (!userValue || userValue <= 0) {
      return `Enter a bet amount for number ${num}, or leave blank to disable.`;
    }
    if (!configuration.avoidRounding) {
      // Normal text
      return `Enter the bet amount for number ${num}. Leave blank to skip betting on ${num}.`;
    } else {
      // “Avoid rounding” is on → show the "adjusted" bet:
      const actualBet = calculateNumberBetAvoidRounding(userValue, num);
      return (
        <>
          <p className='mb-1'>Enter the bet amount for number {num}. (Avoid Rounding is enabled.)</p>
          {
            actualBet === userValue
              ? <small>No adjustment needed. The bet remains ${userValue}.</small>
              : <small>The bet will be adjusted up to ${actualBet} to avoid rounding on payouts.</small>
          }
        </>
      );
    }
  }

  // Check if any number bets have been configured. This tells us to enable their additional configuration options
  const isNumberBetsActive =
    Boolean(configuration.numberBet4 ||
      configuration.numberBet5 ||
      configuration.numberBet6 ||
      configuration.numberBet8 ||
      configuration.numberBet9 ||
      configuration.numberBet10);

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>Number Bets</Accordion.Header>
      <Accordion.Body>
        <p className="mb-2">
          You can make bets on the numbers 4, 5, 6, 8, 9, and 10. Enter a positive amount for each number to enable that bet, or leave it blank to skip.
        </p>
        <p className="mb-2">
          In this simulator, we combine “place” and “buy” bets into a single, simplified “buy‐style” bet that always pays the best possible rate for each number:
        </p>
        <ul className="mb-2">
          <li><strong>4 or 10</strong> pay <em>39:20</em> (about 1.95 × your bet)</li>
          <li><strong>5 or 9</strong> pay <em>7:5</em> (1.4 × your bet)</li>
          <li><strong>6 or 8</strong> pay <em>7:6</em> (about 1.167 × your bet)</li>
        </ul>
        <p className="mb-2">
          This approach automatically grants the better odds of a “buy” bet without requiring you to choose between “place” or “buy.” If you enable “Increase Bet to Avoid Rounding,” your bet amounts are adjusted slightly so your win payouts become clean whole numbers.
        </p>

        <NumericInput
          controlId="numberBet4"
          label="Number 4 Bet"
          value={configuration.numberBet4}
          helpText={getNumberBetHelpText(4, configuration.numberBet4)}
          isValid={true}
          invalidText="Must be greater than 0 if set."
          handleChange={(newValue) => {
            if (newValue != null && newValue <= 0) {
              newValue = 1;
            }
            setConfiguration(configuration.setNumberBet4(newValue));
          }}
        />
        <NumericInput
          controlId="numberBet5"
          label="Number 5 Bet"
          value={configuration.numberBet5}
          helpText={getNumberBetHelpText(5, configuration.numberBet5)}
          isValid={true}
          invalidText="Must be greater than 0 if set."
          handleChange={(newValue) => {
            if (newValue != null && newValue <= 0) {
              newValue = 1;
            }
            setConfiguration(configuration.setNumberBet5(newValue));
          }}
        />
        <NumericInput
          controlId="numberBet6"
          label="Number 6 Bet"
          value={configuration.numberBet6}
          helpText={getNumberBetHelpText(6, configuration.numberBet6)}
          isValid={true}
          invalidText="Must be greater than 0 if set."
          handleChange={(newValue) => {
            if (newValue != null && newValue <= 0) {
              newValue = 1;
            }
            setConfiguration(configuration.setNumberBet6(newValue));
          }}
        />
        <NumericInput
          controlId="numberBet8"
          label="Number 8 Bet"
          value={configuration.numberBet8}
          helpText={getNumberBetHelpText(8, configuration.numberBet8)}
          isValid={true}
          invalidText="Must be greater than 0 if set."
          handleChange={(newValue) => {
            if (newValue != null && newValue <= 0) {
              newValue = 1;
            }
            setConfiguration(configuration.setNumberBet8(newValue));
          }}
        />
        <NumericInput
          controlId="numberBet9"
          label="Number 9 Bet"
          value={configuration.numberBet9}
          helpText={getNumberBetHelpText(9, configuration.numberBet9)}
          isValid={true}
          invalidText="Must be greater than 0 if set."
          handleChange={(newValue) => {
            if (newValue != null && newValue <= 0) {
              newValue = 1;
            }
            setConfiguration(configuration.setNumberBet9(newValue));
          }}
        />
        <NumericInput
          controlId="numberBet10"
          label="Number 10 Bet"
          value={configuration.numberBet10}
          helpText={getNumberBetHelpText(10, configuration.numberBet10)}
          isValid={true}
          invalidText="Must be greater than 0 if set."
          handleChange={(newValue) => {
            if (newValue != null && newValue <= 0) {
              newValue = 1;
            }
            setConfiguration(configuration.setNumberBet10(newValue));
          }}
        />

        <hr />

        <BooleanSwitchInput
          id="placeNumberBetsDuringComeOut"
          label="Place Number Bets During Come‐Out Roll"
          helpText="If enabled, new number bets will be placed during come‐out rolls."
          value={configuration.placeNumberBetsDuringComeOut}
          onChange={(newValue: boolean) => {
            setConfiguration(configuration.setPlaceNumberBetsDuringComeOut(newValue));
          }}
          disabled={!isNumberBetsActive}
        />

        <BooleanSwitchInput
          id="leaveNumberBetsWorkingDuringComeOut"
          label="Leave Number Bets Working During Come‐Out Roll"
          helpText="If enabled, existing number bets remain active during come‐out rolls."
          value={configuration.leaveNumberBetsWorkingDuringComeOut}
          onChange={(newValue: boolean) => {
            setConfiguration(configuration.setLeaveNumberBetsWorkingDuringComeOut(newValue));
          }}
          disabled={!isNumberBetsActive}
        />

        <BooleanSwitchInput
          id="omitNumberBetOnPoint"
          label="Omit Number Bet on the Point Number"
          helpText="If enabled, a bet will not be placed on a number if it matches the current point."
          value={configuration.omitNumberBetOnPoint}
          onChange={(newValue: boolean) => {
            setConfiguration(configuration.setOmitNumberBetOnPoint(newValue));
          }}
          disabled={!isNumberBetsActive}
        />

        <PressStrategyInput
          id="pressStrategy"
          label="Press Strategy"
          strategy={configuration.pressStrategy}
          onChange={(newStrategy) => {
            setConfiguration(configuration.setPressStrategy(newStrategy));
          }}
          disabled={!isNumberBetsActive}
        />

        <NumericInput
          controlId="pressLimit"
          label="Press Limit"
          placeholder="Unlimited"
          value={configuration.pressLimit}
          helpText="Defines how many consecutive wins a number bet remains active before being removed. Leave empty for unlimited."
          isValid={configuration.pressLimit === null || configuration.pressLimit >= 1}
          invalidText="Must be empty (for unlimited) or a number 1 or greater."
          handleChange={(newValue) => {
            setConfiguration(configuration.setPressLimit(newValue));
          }}
          disabled={!isNumberBetsActive}
        />
      </Accordion.Body>
    </Accordion.Item>
  );
};
