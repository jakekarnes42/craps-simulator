import React from 'react';
import Container from 'react-bootstrap/Container';
import ColorModeToggle from './components/configuration/ColorModeToggle';
import ConfigurationContainer from './components/configuration/ConfigurationContainer';
import { SimulationContainer } from './components/simulation/SimulationContainer';
import { Configuration } from './game/Configuration';
import { ThemeProvider } from './theme/ThemeContext';

const AppContent: React.FC = () => {
  const [configuration, setConfiguration] = React.useState(
    Configuration.defaultConfiguration()
  );

  return (
    <Container className="p-3">
      <div className="d-flex mb-3">
        <h1>Craps Simulator</h1>
        <ColorModeToggle />
      </div>
      <p>Configure your strategy below and run the simulations to see the results.</p>
      <ConfigurationContainer
        configuration={configuration}
        setConfiguration={setConfiguration}
      />
      <SimulationContainer configuration={configuration} />
    </Container>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;