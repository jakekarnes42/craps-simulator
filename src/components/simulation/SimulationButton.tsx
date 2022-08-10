
import { Dispatch, SetStateAction } from 'react';
import { Button } from 'react-bootstrap';
import { SimulationState } from './SimulationState';

type SimulationButtonProps = {
    simulationState: SimulationState,
    setSimulationState: Dispatch<SetStateAction<SimulationState>>
}

export const SimulationButton = ({ simulationState, setSimulationState }: SimulationButtonProps) => {

    switch (simulationState) {
        case SimulationState.READY: {
            return (
                <Button
                    variant="primary"
                    onClick={()=> {setSimulationState(SimulationState.RUNNING)}}
                >
                    Click to run
                </Button>
            );
        }
        case SimulationState.RUNNING: {
            return (
                <Button
                    variant="danger"
                    onClick={()=> {setSimulationState(SimulationState.COMPLETE)}}
                >
                    Cancel
                </Button>
            );
        }
        case SimulationState.COMPLETE: {
            return (
                <Button
                    variant="primary"
                    onClick={()=> {setSimulationState(SimulationState.RUNNING)}}
                >
                    Run again
                </Button>
            );
        }
    }

};

