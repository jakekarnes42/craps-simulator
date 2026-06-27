import { useEffect, useState } from 'react';
import { Configuration } from '../../../engine/Configuration';
import { GameState } from '../../../engine/GameState';
import { RollResult, executeSingleRoll } from '../../../engine/Session';
import { RunButton } from '../RunButton';
import { RunState } from '../RunState';
import { SingleSessionResults } from './SingleSessionResults';

type SingleSimulationProps = {
  configuration: Configuration;
};

export const SingleSimulation = ({ configuration }: SingleSimulationProps) => {
  const [runState, setRunState] = useState(RunState.READY);
  const [results, setResults] = useState<Array<RollResult>>([]);

  useEffect(() => {
    if (runState !== RunState.RUNNING) {
      return;
    }

    let gameState = GameState.init(configuration);
    const newResults: RollResult[] = [];

    while (!gameState.isDone()) {
      const rollResult = executeSingleRoll(gameState);
      newResults.push(rollResult);
      gameState = rollResult.resultingState;
    }

    setResults(newResults);
    setRunState(RunState.COMPLETE);
  }, [configuration, runState]);

  return (
    <div className="mb-3">
      <RunButton runState={runState} onRun={() => setRunState(RunState.RUNNING)} />
      <SingleSessionResults results={results} />
    </div>
  );
};

