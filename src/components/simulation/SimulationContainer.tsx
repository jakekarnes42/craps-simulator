
import { Alert, Tab, Tabs } from 'react-bootstrap';
import { Configuration } from '../../game/Configuration';
import { BulkSimulationContainer } from './BulkSimulationContainer';
import { SingleSimulationContainer } from './SingleSimulationContainer';

type SimulationContainerProps = {
  configuration: Configuration,
}

export const SimulationContainer = ({ configuration }: SimulationContainerProps) => {

  //Check if we can even run the simulation
  const invalidFields = configuration.getInvalidFields();
  if (invalidFields.length > 0) {
    return (
      <Alert variant='danger'>
        The following must be corrected before any simulations can begin: <ul>{invalidFields.map((fieldName: string) => <li key={fieldName}>{fieldName}</li>)}</ul>
      </Alert>
    )
  } else {
    return (
      <Tabs defaultActiveKey="single" className="mb-3">
        <Tab eventKey="bulk" title="Bulk Simulation">
          <BulkSimulationContainer
            configuration={configuration} />
        </Tab>
        <Tab eventKey="single" title="Single Simulation">
          <SingleSimulationContainer
            configuration={configuration} />
        </Tab>
      </Tabs>
    );
  }
};

