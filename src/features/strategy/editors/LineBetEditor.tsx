import { Dispatch, SetStateAction } from 'react';
import { Configuration } from '../../../engine/Configuration';
import { OddsBetStrategy } from '../../../engine/Strategies';
import NumberField from '../../../shared/forms/NumberField';
import OddsStrategyControl from '../controls/OddsStrategyControl';

type LineBetEditorProps = {
  title: string;
  baseBet: number | null;
  oddsStrategy: OddsBetStrategy;
  dont: boolean;
  configuration: Configuration;
  setConfiguration: Dispatch<SetStateAction<Configuration>>;
  setBaseBet: (configuration: Configuration, value: number | null) => Configuration;
  setOddsStrategy: (configuration: Configuration, strategy: OddsBetStrategy) => Configuration;
};

const positiveOrNull = (value: number | null) => value !== null && value > 0 ? value : null;

export const LineBetEditor = ({
  title,
  baseBet,
  oddsStrategy,
  dont,
  configuration,
  setConfiguration,
  setBaseBet,
  setOddsStrategy,
}: LineBetEditorProps): JSX.Element => (
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
        helpText="Placed on come-out rolls while the point is off."
        invalidText="Must be a positive number or empty."
        onChange={(value) => setConfiguration(setBaseBet(configuration, positiveOrNull(value)))}
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
    </div>
  </section>
);
