
import { useEffect, useState } from 'react';
import { Configuration } from '../../game/Configuration';
import { BetCollection, GameState } from '../../game/GameState';

import { BulkResultDisplay } from './BulkResultDisplay';
import { SimulationButton } from './SimulationButton';
import { SimulationState } from './SimulationState';
import { SessionAnalytics } from '../../game/Session';

type BulkSimulationContainerProps = {
  configuration: Configuration,
}

export const BulkSimulationContainer = ({ configuration }: BulkSimulationContainerProps) => {

  const [simulationState, setSimulationState] = useState(SimulationState.READY);
  const [completed, setCompleted] = useState(0);
  const [results, setResults] = useState<Array<SessionAnalytics>>([]);
  const [workers, setWorkers] = useState<Array<Worker>>([]);

  const simulationTotal = configuration.simulationCount ? configuration.simulationCount : 1;

  //Execute this side effect only when simulationState changes
  useEffect(() => {
    //If we've transitioned into a Running state
    if (simulationState === SimulationState.RUNNING) {
      //Clear past results
      setResults([]);
      setCompleted(0);

      //Create new workers
      for (let i = 0; i < navigator.hardwareConcurrency; i++) {

        const worker: Worker = new Worker(new URL('../../worker/bulkGame.worker.ts', import.meta.url), { type: 'module' });
        //Setup message handler for data coming from the worker
        worker.onmessage = ($event: MessageEvent) => {
          //Handle new data coming back from the worker. 
          if ($event && $event.data === "1000 complete") {
            setCompleted(completed => completed + 1000)
          } else if ($event && $event.data) {
            const workerOutput = $event.data;
            const workerResults = workerOutput.map((workerResult: any) => {
              const fs = workerResult.finalState;
              const gameState = new GameState(
                {
                  configuration,
                  rollNum: fs.rollNum,
                  bankroll: fs.bankroll,
                  point: fs.point,
                  pointIsOn: fs.pointIsOn,
                  currentBets: fs.currentBets,
                  cashedOutNumbers: fs.cashedOutNumbers
                }
              );
              return {
                ...workerResult,
                finalState: gameState
              } as SessionAnalytics;
            });

            setResults(results => [...results, ...workerResults]);
          }
        };

        const simCount = i < simulationTotal % navigator.hardwareConcurrency ? Math.floor(simulationTotal / navigator.hardwareConcurrency) + 1 : Math.floor(simulationTotal / navigator.hardwareConcurrency)

        //Start the worker
        worker.postMessage({ configuration, simCount });

        setWorkers(workers => [...workers, worker]);
      }
    }

    //If we've transitioned into a Completed state
    if (simulationState === SimulationState.COMPLETE) {
      workers.forEach(worker => worker.terminate()); // Terminate all workers
      setWorkers([]); // Clear worker list
    }


    //Return a clean up function in case component is unmounted or simulationState changes
    return () => {
      //Execute cleanup by terminating workers
      workers.forEach(worker => { worker.terminate() });
    }

  }, [configuration, simulationState]);

  //Execute this side effect only when results change
  useEffect(() => {
    if (results.length === simulationTotal) {
      //Update state after all results collected
      setSimulationState(SimulationState.COMPLETE);
    }
  }, [results]);

  let resultDisplay;
  switch (simulationState) {
    case SimulationState.COMPLETE:
      resultDisplay = <BulkResultDisplay results={results}></BulkResultDisplay>;
      break;
    case SimulationState.RUNNING:
      resultDisplay = <p>Simulation in progress: {Math.floor((completed / simulationTotal) * 100)}%</p>
      break;
    default:
      resultDisplay = <p>Begin the simulation by clicking the button above</p>
      break;
  }

  return (
    <div className="mb-3">
      <SimulationButton simulationState={simulationState} setSimulationState={setSimulationState} />
      {resultDisplay}
    </div>
  );


};



