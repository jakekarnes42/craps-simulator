import { useEffect, useState } from 'react';
import { Configuration } from '../../../engine/Configuration';
import { GameState } from '../../../engine/GameState';
import type { SessionAnalytics } from '../../../engine/Session';
import type { BulkSimulationWorkerInput, BulkSimulationWorkerMessage } from './workerMessages';

import { RunButton } from '../RunButton';
import { RunState } from '../RunState';
import { BulkSimulationResults } from './BulkSimulationResults';

type BulkSimulationProps = {
  configuration: Configuration;
};

export const BulkSimulation = ({ configuration }: BulkSimulationProps) => {

  const [runState, setRunState] = useState(RunState.READY);
  const [completed, setCompleted] = useState(0);
  const [results, setResults] = useState<Array<SessionAnalytics>>([]);

  const simulationTotal = configuration.simulationCount!;

  useEffect(() => {
    if (runState !== RunState.RUNNING) {
      return;
    }

    setResults([]);
    setCompleted(0);

    const workerCount = Math.max(1, Math.min(navigator.hardwareConcurrency || 1, simulationTotal));
    const baseSimCount = Math.floor(simulationTotal / workerCount);
    const extraSimulations = simulationTotal % workerCount;
    const workers = Array.from({ length: workerCount }, (_, index) => {
      const worker = new Worker(new URL('./bulkSimulation.worker.ts', import.meta.url), { type: 'module' });
      const simCount = baseSimCount + (index < extraSimulations ? 1 : 0);

      worker.onmessage = ($event: MessageEvent<BulkSimulationWorkerMessage>) => {
        const message = $event.data;

        if (message.type === 'progress') {
          setCompleted(completed => Math.min(simulationTotal, completed + message.completed));
          return;
        }

        const workerResults = message.results.map((workerResult) => ({
          ...workerResult,
          finalState: GameState.fromSnapshot(configuration, workerResult.finalState),
        }));

        setResults(results => [...results, ...workerResults]);
      };

      worker.postMessage({ configuration, simCount } satisfies BulkSimulationWorkerInput);
      return worker;
    });

    return () => {
      workers.forEach(worker => worker.terminate());
    };

  }, [configuration, runState, simulationTotal]);

  useEffect(() => {
    if (results.length === simulationTotal) {
      setRunState(RunState.COMPLETE);
    }
  }, [results.length, simulationTotal]);

  let resultDisplay;
  switch (runState) {
    case RunState.COMPLETE:
      resultDisplay = <BulkSimulationResults results={results} />;
      break;
    case RunState.RUNNING:
      resultDisplay = <p>Simulation in progress: {Math.floor((completed / simulationTotal) * 100)}%</p>;
      break;
    default:
      resultDisplay = <p>Begin the simulation by clicking the button above</p>;
      break;
  }

  return (
    <div className="mb-3">
      <RunButton
        runState={runState}
        onRun={() => setRunState(RunState.RUNNING)}
        onCancel={() => setRunState(RunState.READY)}
      />
      {resultDisplay}
    </div>
  );
};

