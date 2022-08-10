
import { useEffect, useState } from 'react';
import { Configuration } from '../../game/Configuration';
import { SimulationButton } from './SimulationButton';
import { SimulationState } from './SimulationState';
import BulkGameWorker from '../../worker/bulkGame.worker';
import { BulkResultDisplay } from './BulkResultDisplay';
import { BetCollection, GameState } from '../../game/GameState';

type BulkSimulationContainerProps = {
  configuration: Configuration,
}

export const BulkSimulationContainer = ({ configuration }: BulkSimulationContainerProps) => {

  const [simulationState, setSimulationState] = useState(SimulationState.READY);
  const [completed, setCompleted] = useState(0);
  const [results, setResults] = useState<Array<GameState>>([]);
  const [workers, setWorkers] = useState<Array<Worker>>([]);

  const simulationTotal = configuration.simulationCount ? configuration.simulationCount : 1;

  //Execute this side effect only when simulationState changes
  useEffect(() => {
    console.log("Running simulation change useEffect");
    //If we've transitioned into a Running state
    if (simulationState === SimulationState.RUNNING) {
      //Clear past results
      setResults([]);
      setCompleted(0);

      //Create a new worker
      console.log("Launching workers");

      for (let i = 0; i < navigator.hardwareConcurrency; i++) {

        const worker: Worker = new BulkGameWorker();
        //Setup message handler for data coming from the worker
        worker.onmessage = ($event: MessageEvent) => {
          //Handle new data coming back from the worker. 
          if ($event && $event.data === "1000 complete") {
            setCompleted(completed => completed + 1000)
          } else if ($event && $event.data) {
            console.log("New results from worker. Updating list");

            const workerOutput = $event.data;
            const workerResults = workerOutput.map((workerResult: { rollNum: number; bankroll: number; point: number; pointIsOn: boolean; currentBets: BetCollection; }) => {
              return new GameState(
                {
                  configuration,
                  rollNum: workerResult.rollNum,
                  bankroll: workerResult.bankroll,
                  point: workerResult.point,
                  pointIsOn: workerResult.pointIsOn,
                  currentBets: workerResult.currentBets
                }
              )
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
      console.log("Simulation cancelled. Terminating workers");
      workers.forEach(worker => { worker.terminate() });
      setWorkers(workers => []);
    }


    //Return a clean up function in case component is unmounted or simulationState changes
    return () => {
      console.log("Terminating workers in cleanup");
      workers.forEach(worker => { worker.terminate() });
    }

  }, [configuration, simulationState]);

  //Execute this side effect only when results change
  useEffect(() => {
    console.log("Running results change useEffect");
    if (results.length === simulationTotal) {
      console.log("All results collected");
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



