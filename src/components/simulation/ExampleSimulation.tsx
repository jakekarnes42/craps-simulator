
import { useEffect, useState } from 'react';
import { Configuration } from '../../game/Configuration';
import { SimulationButton } from './SimulationButton';
import { SimulationState } from './SimulationState';
import TestWorker from '../../worker/test.worker';


export const ExampleSimulationContainer = () => {

  const [simulationState, setSimulationState] = useState(SimulationState.READY);
  const [results, setResults] = useState<Array<JSX.Element>>([]);

  //Execute this side effect only when simulationState changes
  useEffect(() => {
    console.log("Running use effect");
    //If we've transitioned into a Running state
    if (simulationState === SimulationState.RUNNING) {
      //Create a new worker
      console.log("Launching worker");
      const worker: Worker = new TestWorker();

      //Setup message handler for data coming from the worker
      worker.onmessage = ($event: MessageEvent) => {
        //Handle worker completion message
        if ($event && $event.data === "Done") {
          console.log("Simulation complete. Updating state");
          setSimulationState(SimulationState.COMPLETE);
        }
        //Handle new data coming back from the worker. 
        else if ($event && $event.data) {
          console.log("New result from worker. Updating list");
          setResults(results => [...results, <p>New output: {$event.data}</p>]);
        }
      };

      //Start the worker
      worker.postMessage({ msg: 'run' });

      //Return a clean up function in case component is unmounted or simulationState changes
      return () => {
        console.log("Terminating worker in cleanup");
        worker.terminate();
      }
    }
  }, [simulationState]);

  const resultListItems = results.map((result, index) =>
    <li key={index}>{result}</li>
  );

  return (
    <div className="mb-3">
      <SimulationButton simulationState={simulationState} setSimulationState={setSimulationState} />
      <ul>{resultListItems}</ul>
    </div>
  );


};



