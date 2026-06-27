import React, { Dispatch, SetStateAction } from 'react';
import { Configuration } from '../../../engine/Configuration';
import { TablePrecision } from '../../../engine/Money';
import NumberField from '../../../shared/forms/NumberField';
import SwitchField from '../../../shared/forms/SwitchField';
import TablePrecisionControl from '../controls/TablePrecisionControl';

interface TableSettingsProps {
  configuration: Configuration;
  setConfiguration: Dispatch<SetStateAction<Configuration>>;
}

export const TableSettings: React.FC<TableSettingsProps> = ({
  configuration,
  setConfiguration
}) => {
  const summaryItems = [
    `Bankroll $${configuration.initialBankroll ?? '-'}`,
    `${configuration.maximumRolls ?? '-'} rolls`,
    `${configuration.simulationCount ?? '-'} sims`,
  ];

  return (
    <details className="workspace-panel settings-panel mb-4">
      <summary>
        <span>Table & Simulation Settings</span>
        <span className="settings-summary">{summaryItems.join(' | ')}</span>
      </summary>

      <div className="settings-panel-body">
        <section className="settings-section">
          <h2>Session</h2>
          <div className="settings-grid">
            <NumberField
                id="initialBankroll"
                label="Initial Bankroll"
                value={configuration.initialBankroll}
                isValid={configuration.isInitialBankrollValid()}
                helpText="Starting bankroll for each simulated session."
                invalidText="Must be a positive whole number."
                onChange={(val) => setConfiguration(configuration.setInitialBankroll(val))}
            />
            <NumberField
                id="maxRolls"
                label="Maximum Rolls"
                value={configuration.maximumRolls}
                min={1}
                step={1}
                isValid={configuration.isMaximumRollsValid()}
                helpText="Stop placing new bets after this many rolls. Existing bets resolve first."
                invalidText="Must be a positive whole number."
                onChange={(val) => setConfiguration(configuration.setMaximumRolls(val))}
            />
            <NumberField
                id="simulationCount"
                label="Simulation Count"
                value={configuration.simulationCount}
                min={1}
                step={1}
                isValid={configuration.isSimulationCountValid()}
                helpText="Number of sessions to run in bulk simulation."
                invalidText="Must be a positive whole number."
                onChange={(val) => setConfiguration(configuration.setSimulationCount(val))}
            />
          </div>
        </section>

        <section className="settings-section">
          <h2>Stop Conditions</h2>
          <div className="settings-grid">
            <NumberField
                id="bankrollMinimum"
                label="Bankroll Minimum"
                value={configuration.bankrollMinimum}
                isValid={configuration.isBankrollMinimumValid()}
                helpText="Stop placing new bets once bankroll reaches this floor. Leave empty to play until busted."
                invalidText="Must be non-negative and less than initial bankroll."
                onChange={(val) => setConfiguration(configuration.setBankrollMinimum(val))}
            />
            <NumberField
                id="bankrollMaximum"
                label="Bankroll Maximum"
                value={configuration.bankrollMaximum}
                isValid={configuration.isBankrollMaximumValid()}
                helpText="Stop placing new bets once bankroll reaches this goal."
                invalidText="Must be greater than initial bankroll or empty."
                onChange={(val) => setConfiguration(configuration.setBankrollMaximum(val))}
            />
            <NumberField
                id="pressLimit"
                label="Press Limit"
                placeholder="Unlimited"
                value={configuration.pressLimit}
                min={1}
                step={1}
                isValid={configuration.isPressLimitValid()}
                helpText="Cash out a number bet after this many wins. Leave empty for unlimited."
                invalidText="Must be empty or a positive whole number."
                onChange={(val) => setConfiguration(configuration.setPressLimit(val))}
            />
          </div>
        </section>

        <section className="settings-section">
          <h2>Number Rules</h2>
          <div className="settings-switch-grid">
            <SwitchField
              id="omitNumberBetOnPoint"
              label="Omit Place Bet on Point"
              helpText="If your pass line point is 6, do not make a place bet on 6."
              value={configuration.omitNumberBetOnPoint}
              onChange={(val) => setConfiguration(configuration.setOmitNumberBetOnPoint(val))}
            />
            <SwitchField
              id="placeNumberBetsDuringComeOut"
              label="Place Number Bets on Come Out"
              helpText="Place new number bets while the point is off."
              value={configuration.placeNumberBetsDuringComeOut}
              onChange={(val) => setConfiguration(configuration.setPlaceNumberBetsDuringComeOut(val))}
            />
            <SwitchField
              id="workingComeOut"
              label="Number Bets Working on Come Out"
              helpText="Leave place bets working during the come out roll."
              value={configuration.leaveNumberBetsWorkingDuringComeOut}
              onChange={(val) => setConfiguration(configuration.setLeaveNumberBetsWorkingDuringComeOut(val))}
            />
            <SwitchField
              id="avoidRounding"
              label="Standard Box Man Units"
              helpText="Adjusts bets into payout-friendly units and prevents fractional payouts."
              value={configuration.avoidRounding}
              onChange={(val) => setConfiguration(configuration.setAvoidRounding(val))}
            />
            <TablePrecisionControl
              id="tablePrecision"
              label="Table Precision"
              disabled={configuration.avoidRounding}
              precision={configuration.tablePrecision}
              onChange={(val: TablePrecision) => setConfiguration(configuration.setTablePrecision(val))}
            />
          </div>
        </section>
      </div>
    </details>
  );
};
