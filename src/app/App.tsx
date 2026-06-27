import React from 'react';
import Container from 'react-bootstrap/Container';
import ColorModeToggle from './ColorModeToggle';
import { Configuration } from '../engine/Configuration';
import { SimulationPanel } from '../features/simulation/SimulationPanel';
import { StrategyBuilder } from '../features/strategy/StrategyBuilder';
import { ThemeProvider } from './ThemeProvider';

const AppContent: React.FC = () => {
  const [configuration, setConfiguration] = React.useState(
    Configuration.defaultConfiguration()
  );

  return (
    <Container className="app-container p-3">
      <div className="app-header d-flex mb-3 align-items-center justify-content-between">
        <h1 className="mb-0">Craps Simulator</h1>
        <ColorModeToggle />
      </div>
      <StrategyBuilder
        configuration={configuration}
        setConfiguration={setConfiguration}
      />
      <SimulationPanel configuration={configuration} />
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
