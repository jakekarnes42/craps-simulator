import React, { useState, Dispatch, SetStateAction } from 'react';
import { Configuration } from '../../engine/Configuration';
import { CRAPS_NUMBERS, CrapsNumber } from '../../engine/NumberBets';
import { BetBoard } from './BetBoard';
import { BetEditor } from './BetEditor';
import { TableSettings } from './editors/TableSettings';
import {
  isNumberStrategyZone,
  numberForZone,
  StrategyEditor,
  StrategyMacro,
  STRATEGY_MACRO_NUMBERS,
  StrategyZone,
} from './selection';

interface StrategyBuilderProps {
  configuration: Configuration;
  setConfiguration: Dispatch<SetStateAction<Configuration>>;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  configuration,
  setConfiguration
}) => {
  const [activeEditor, setActiveEditor] = useState<StrategyEditor>('PASS');
  const [selectedNumbers, setSelectedNumbers] = useState<CrapsNumber[]>([]);

  const handleZoneActivate = (zone: StrategyZone) => {
    if (!isNumberStrategyZone(zone)) {
      setActiveEditor(zone);
      return;
    }

    const number = numberForZone(zone);
    if (number === undefined) return;
    setActiveEditor('NUMBERS');
    setSelectedNumbers(prev => {
      if (activeEditor !== 'NUMBERS') return [number];
      if (prev.includes(number)) {
        return prev.filter(selectedNumber => selectedNumber !== number);
      }
      return [...prev, number].sort((a, b) => CRAPS_NUMBERS.indexOf(a) - CRAPS_NUMBERS.indexOf(b));
    });
  };

  const handleSelectedNumbersChange = (numbers: CrapsNumber[]) => {
    setActiveEditor('NUMBERS');
    setSelectedNumbers(numbers);
  };

  const handleClearAllBets = () => {
    if (window.confirm('Are you sure you want to clear all bets on the table?')) {
      let newConfig = configuration;
      newConfig = newConfig.setPassBet(null).setDontPassBet(null).setComeBet(null).setDontComeBet(null);
      newConfig = CRAPS_NUMBERS.reduce(
        (config, number) => config.setNumberBet(number, null),
        newConfig
      );
      setConfiguration(newConfig);
      setSelectedNumbers([]);
      setActiveEditor('PASS');
    }
  };

  const handleSelectMacro = (macro: StrategyMacro) => {
    handleSelectedNumbersChange(STRATEGY_MACRO_NUMBERS[macro]);
  };

  return (
    <div className="strategy-builder-container">
      <div className="strategy-workspace mb-4">
        <BetBoard
          activeEditor={activeEditor}
          selectedNumbers={selectedNumbers}
          onZoneActivate={handleZoneActivate}
          onClearAllBets={handleClearAllBets}
          onMacroSelect={handleSelectMacro}
          configuration={configuration}
        />
        <BetEditor
          activeEditor={activeEditor}
          selectedNumbers={selectedNumbers}
          onSelectedNumbersChange={handleSelectedNumbersChange}
          configuration={configuration}
          setConfiguration={setConfiguration}
        />
      </div>

      <div className="mb-4">
        <TableSettings
          configuration={configuration}
          setConfiguration={setConfiguration}
        />
      </div>
    </div>
  );
};
