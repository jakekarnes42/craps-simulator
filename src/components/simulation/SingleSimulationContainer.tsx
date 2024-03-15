
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
    console.log("Running use effect");
    //If we've transitioned into a Running state
    if (simulationState === SimulationState.RUNNING) {
      //Clear past results
      setResults([]);

      //Not using web worker
      let gameState = GameState.init(configuration);
      while (!gameState.isDone()) {
        console.log("Executing 1 roll");
        const output = executeSingleRoll(gameState);
        console.log("Executed 1 roll. Sending result");
        setResults(results => [...results, output]);
        gameState = output.resultingState;
      }
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



