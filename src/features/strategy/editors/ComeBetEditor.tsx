import { Dispatch, SetStateAction } from 'react';
import { Configuration } from '../../../engine/Configuration';
import { OddsBetStrategy } from '../../../engine/Strategies';
import NumberField from '../../../shared/forms/NumberField';
import SwitchField from '../../../shared/forms/SwitchField';
import ComeBetCountControl from '../controls/ComeBetCountControl';
import OddsStrategyControl from '../controls/OddsStrategyControl';

type ComeBetEditorProps = {
  title: string;
  baseBet: number | null;
  maxBets: number;
  oddsStrategy: OddsBetStrategy;
  oddsWorkingComeOut: boolean;
  dont: boolean;
  configuration: Configuration;
  setConfiguration: Dispatch<SetStateAction<Configuration>>;
  setBaseBet: (configuration: Configuration, value: number | null) => Configuration;
  setMaxBets: (configuration: Configuration, value: number) => Configuration;
  setOddsStrategy: (configuration: Configuration, strategy: OddsBetStrategy) => Configuration;
  setOddsWorkingComeOut: (configuration: Configuration, value: boolean) => Configuration;
};

const positiveOrNull = (value: number | null) => value !== null && value > 0 ? value : null;

export const ComeBetEditor = ({
  title,
  baseBet,
  maxBets,
  oddsStrategy,
  oddsWorkingComeOut,
  dont,
  configuration,
  setConfiguration,
  setBaseBet,
  setMaxBets,
  setOddsStrategy,
  setOddsWorkingComeOut,
}: ComeBetEditorProps): JSX.Element => (
  <section className="workspace-panel strategy-editor-panel" aria-label={`${title} editor`}>
    <div className="panel-heading">
      <h2>{title}</h2>
    </div>
    <div className="editor-grid">
      <NumberField
        id={`${title.replace(/\W+/g, '-').toLowerCase()}-base-bet`}
        label="Base Bet"
        value={baseBet}
        isValid
        helpText="Placed while the point is on, up to the configured count."
        invalidText="Must be a positive number or empty."
        onChange={(value) => setConfiguration(setBaseBet(configuration, positiveOrNull(value)))}
      />
      <ComeBetCountControl
        id={`${title.replace(/\W+/g, '-').toLowerCase()}-max`}
        label={title}
        controllingBetValue={baseBet}
        maxBets={maxBets}
        onChange={(value) => setConfiguration(setMaxBets(configuration, value))}
      />
      <OddsStrategyControl
        id={`${title.replace(/\W+/g, '-').toLowerCase()}-odds`}
        label={title}
        controllingBetValue={baseBet}
        avoidRounding={configuration.avoidRounding}
        precision={configuration.tablePrecision}
        strategy={oddsStrategy}
        onChange={(strategy) => setConfiguration(setOddsStrategy(configuration, strategy))}
        dont={dont}
      />
      <SwitchField
        id={`${title.replace(/\W+/g, '-').toLowerCase()}-working-come-out`}
        label={`${title} Odds Working on Come Out`}
        helpText="Leave established odds working while the main point is off."
        value={oddsWorkingComeOut}
        onChange={(value) => setConfiguration(setOddsWorkingComeOut(configuration, value))}
        disabled={!baseBet}
      />
    </div>
  </section>
);
