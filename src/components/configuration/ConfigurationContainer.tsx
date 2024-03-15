import { Dispatch, SetStateAction } from 'react';
import { Accordion } from 'react-bootstrap';
import { Configuration } from '../../game/Configuration';
import GameConfiguration from './GameConfiguration';
import PlayerConfiguration from './PlayerConfiguration';
import StrategyConfiguration from './StrategyConfiguration';


type ConfigurationContainerProps = {
  configuration: Configuration,
  setConfiguration: Dispatch<SetStateAction<Configuration>>
}

const ConfigurationContainer = ({ configuration, setConfiguration }: ConfigurationContainerProps) => {

  return (
    <Accordion defaultActiveKey={['playerConfiguration', 'strategyConfiguration', 'passBet']} alwaysOpen className="mb-3">
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
      <GameConfiguration
        eventKey='gameConfiguration'
        configuration={configuration}
        setConfiguration={setConfiguration}
      />
    </Accordion>
  );
};

export default ConfigurationContainer;
