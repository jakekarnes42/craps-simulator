import { Dispatch, SetStateAction } from 'react';
import { Accordion } from 'react-bootstrap';
import { Configuration } from '../../game/Configuration';
import SimulationConfiguration from './SimulationConfiguration';
import PlayerConfiguration from './PlayerConfiguration';
import StrategyConfiguration from './StrategyConfiguration';


type ConfigurationContainerProps = {
  configuration: Configuration,
  setConfiguration: Dispatch<SetStateAction<Configuration>>
}

const ConfigurationContainer = ({ configuration, setConfiguration }: ConfigurationContainerProps) => {

  return (
    <Accordion defaultActiveKey={['playerConfiguration', 'strategyConfiguration', 'passBet', 'simulationConfiguration']} alwaysOpen className="mb-3">
      <PlayerConfiguration
        eventKey="playerConfiguration"
        configuration={configuration}
        setConfiguration={setConfiguration}
      />
      <StrategyConfiguration
        eventKey="strategyConfiguration"
        configuration={configuration}
        setConfiguration={setConfiguration}
      />
      <SimulationConfiguration
        eventKey='simulationConfiguration'
        configuration={configuration}
        setConfiguration={setConfiguration}
      />
    </Accordion>
  );
};

export default ConfigurationContainer;
