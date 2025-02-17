
import { useEffect, useState } from 'react';
import { Configuration } from '../../game/Configuration';
import { GameState } from '../../game/GameState';
import { RollResult, executeSingleRoll } from '../../game/Session';
import { SimulationButton } from './SimulationButton';
import { SimulationState } from './SimulationState';
import { SingleGameResultDisplay } from './SingleGameResultDisplay';

type SingleSimulationContainerProps = {
  configuration: Configuration,
}

export const SingleSimulationContainer = ({ configuration }: SingleSimulationContainerProps) => {

  const [simulationState, setSimulationState] = useState(SimulationState.READY);
  const [results, setResults] = useState<Array<RollResult>>([]);

  //Execute this side effect only when simulationState changes
  useEffect(() => {
    //If we've transitioned into a Running state
    if (simulationState === SimulationState.RUNNING) {
      //Clear past results
      setResults([]);

      // Run the entire simulation in a tight loop, without using a web worker. 
      let gameState = GameState.init(configuration);
      const newResults: RollResult[] = [];

      while (!gameState.isDone()) {
        const rollResult = executeSingleRoll(gameState);
        newResults.push(rollResult);
        gameState = rollResult.resultingState;
      }

      // Update React state once, at the very end
      setResults(newResults);
      setSimulationState(SimulationState.COMPLETE);
    }
  }, [configuration, simulationState]);

  return (
    <div className="mb-3">
      <SimulationButton simulationState={simulationState} setSimulationState={setSimulationState} />
      <SingleGameResultDisplay results={results}></SingleGameResultDisplay>
    </div>
  );


};



