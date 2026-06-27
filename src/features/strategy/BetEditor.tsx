import { Dispatch, SetStateAction } from 'react';
import { Configuration } from '../../engine/Configuration';
import { CrapsNumber } from '../../engine/NumberBets';
import { ComeBetEditor } from './editors/ComeBetEditor';
import { LineBetEditor } from './editors/LineBetEditor';
import { NumberBetEditor } from './editors/NumberBetEditor';
import { StrategyEditor } from './selection';

type BetEditorProps = {
  activeEditor: StrategyEditor;
  selectedNumbers: CrapsNumber[];
  onSelectedNumbersChange: (numbers: CrapsNumber[]) => void;
  configuration: Configuration;
  setConfiguration: Dispatch<SetStateAction<Configuration>>;
};

export const BetEditor = ({
  activeEditor,
  selectedNumbers,
  onSelectedNumbersChange,
  configuration,
  setConfiguration,
}: BetEditorProps): JSX.Element => {
  switch (activeEditor) {
    case 'PASS':
      return (
        <LineBetEditor
          title="Pass Line"
          baseBet={configuration.passBet}
          oddsStrategy={configuration.passBetOddsStrategy}
          dont={false}
          configuration={configuration}
          setConfiguration={setConfiguration}
          setBaseBet={(config, value) => config.setPassBet(value)}
          setOddsStrategy={(config, strategy) => config.setPassBetOddsStrategy(strategy)}
        />
      );
    case 'DONT_PASS':
      return (
        <LineBetEditor
          title="Don't Pass"
          baseBet={configuration.dontPassBet}
          oddsStrategy={configuration.dontPassBetOddsStrategy}
          dont
          configuration={configuration}
          setConfiguration={setConfiguration}
          setBaseBet={(config, value) => config.setDontPassBet(value)}
          setOddsStrategy={(config, strategy) => config.setDontPassBetOddsStrategy(strategy)}
        />
      );
    case 'COME':
      return (
        <ComeBetEditor
          title="Come"
          baseBet={configuration.comeBet}
          maxBets={configuration.maxComeBets}
          oddsStrategy={configuration.comeBetOddsStrategy}
          oddsWorkingComeOut={configuration.comeBetOddsWorkingComeOut}
          dont={false}
          configuration={configuration}
          setConfiguration={setConfiguration}
          setBaseBet={(config, value) => config.setComeBet(value)}
          setMaxBets={(config, value) => config.setMaxComeBets(value)}
          setOddsStrategy={(config, strategy) => config.setComeBetOddsStrategy(strategy)}
          setOddsWorkingComeOut={(config, value) => config.setComeBetOddsWorkingComeOut(value)}
        />
      );
    case 'DONT_COME':
      return (
        <ComeBetEditor
          title="Don't Come"
          baseBet={configuration.dontComeBet}
          maxBets={configuration.maxDontComeBets}
          oddsStrategy={configuration.dontComeBetOddsStrategy}
          oddsWorkingComeOut={configuration.dontComeBetOddsWorkingComeOut}
          dont
          configuration={configuration}
          setConfiguration={setConfiguration}
          setBaseBet={(config, value) => config.setDontComeBet(value)}
          setMaxBets={(config, value) => config.setMaxDontComeBets(value)}
          setOddsStrategy={(config, strategy) => config.setDontComeBetOddsStrategy(strategy)}
          setOddsWorkingComeOut={(config, value) => config.setDontComeBetOddsWorkingComeOut(value)}
        />
      );
    case 'NUMBERS':
      return (
        <NumberBetEditor
          selectedNumbers={selectedNumbers}
          onSelectedNumbersChange={onSelectedNumbersChange}
          configuration={configuration}
          setConfiguration={setConfiguration}
        />
      );
  }
};
