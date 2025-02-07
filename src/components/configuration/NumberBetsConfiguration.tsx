import { Dispatch, SetStateAction } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import { Configuration } from '../../game/Configuration';
import BooleanSwitchInput from './BooleanSwitchInput';
import NumericInput from './NumericInput';
import { calculateNumberBetAvoidRounding } from '../../util/Util';

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
      return `Enter a wager amount for number ${num}, or leave blank to disable.`;
    }
    if (!configuration.avoidRounding) {
      // Normal text
      return `Enter the wager amount for number ${num}. Leave blank to skip betting on ${num}.`;
    } else {
      // “Avoid rounding” is on → show the "adjusted" bet:
      const actualBet = calculateNumberBetAvoidRounding(userValue, num);
      return (
        <>
          <p className='mb-1'>Enter the wager amount for number {num}. (Avoid Rounding is enabled.)</p>
          {
            actualBet === userValue
              ? <small>No adjustment needed. The bet remains ${userValue}.</small>
              : <small>The bet will be adjusted up to ${actualBet} to avoid rounding on payouts.</small>
          }
        </>
      );
    }
  }

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>Number Bets</Accordion.Header>
      <Accordion.Body>
        <p>
          Configure your wagers for numbers 4, 5, 6, 8, 9, and 10 below.
          Enter a positive wager amount to bet on that number, or leave blank to disable it.
        </p>

        <NumericInput
          controlId="numberBet4"
          label="Number 4 Wager"
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
          label="Number 5 Wager"
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
          label="Number 6 Wager"
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
          label="Number 8 Wager"
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
          label="Number 9 Wager"
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
          label="Number 10 Wager"
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
        />

        <BooleanSwitchInput
          id="leaveNumberBetsWorkingDuringComeOut"
          label="Leave Number Bets Working During Come‐Out Roll"
          helpText="If enabled, existing number bets remain active during come‐out rolls."
          value={configuration.leaveNumberBetsWorkingDuringComeOut}
          onChange={(newValue: boolean) => {
            setConfiguration(configuration.setLeaveNumberBetsWorkingDuringComeOut(newValue));
          }}
        />

        <BooleanSwitchInput
          id="omitNumberBetOnPoint"
          label="Omit Number Bet on the Point Number"
          helpText="If enabled, a wager will not be placed on a number if it matches the current point."
          value={configuration.omitNumberBetOnPoint}
          onChange={(newValue: boolean) => {
            setConfiguration(configuration.setOmitNumberBetOnPoint(newValue));
          }}
        />

        <BooleanSwitchInput
          id="leaveWinningNumberBetsWorking"
          label="Leave Winning Number Bets Working"
          helpText="If enabled, the original bet stays active after a win, and only the winnings are added to the bankroll. If disabled, both the bet and winnings are removed and added to the bankroll upon a win."
          value={configuration.leaveWinningNumberBetsWorking}
          onChange={(newValue: boolean) => {
            setConfiguration(configuration.setLeaveWinningNumberBetsWorking(newValue));
          }}
        />
      </Accordion.Body>
    </Accordion.Item>
  );
};
