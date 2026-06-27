import { Alert, Tab, Tabs } from 'react-bootstrap';
import { Configuration } from '../../engine/Configuration';
import { BulkSimulation } from './bulk/BulkSimulation';
import { SingleSimulation } from './single/SingleSimulation';

type SimulationPanelProps = {
  configuration: Configuration;
};

export const SimulationPanel = ({ configuration }: SimulationPanelProps) => {
  const invalidFields = configuration.getInvalidFields();

  if (invalidFields.length > 0) {
    return (
      <Alert variant="danger">
        The following must be corrected before any simulations can begin:
        <ul>
          {invalidFields.map((fieldName) => <li key={fieldName}>{fieldName}</li>)}
        </ul>
      </Alert>
    );
  }

  return (
    <Tabs defaultActiveKey="single" className="mb-3">
      <Tab eventKey="bulk" title="Bulk Simulation">
        <BulkSimulation configuration={configuration} />
      </Tab>
      <Tab eventKey="single" title="Single Simulation">
        <SingleSimulation configuration={configuration} />
      </Tab>
    </Tabs>
  );
};

