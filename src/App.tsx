import React from 'react';
import Container from 'react-bootstrap/Container';
import ConfigurationContainer from './components/configuration/ConfigurationContainer';
import { SimulationContainer } from './components/simulation/SimulationContainer';
import { Configuration } from './game/Configuration';

const App = () => {

  //Various configuration values that the user can set, maintained as state
  const [configuration, setConfiguration] = React.useState(Configuration.defaultConfiguration());

  return (
    <Container className="p-3">
      <div>
        <h1 className="header">
          Craps Simulator
        </h1>
      </div>
      <p>Configure your strategy below and run the simulations to see the results.</p>
      <ConfigurationContainer
        configuration={configuration}
        setConfiguration={setConfiguration}
      />
      <SimulationContainer
        configuration={configuration}
      />
    </Container>
  );
};

export default App;