import { Button } from 'react-bootstrap';
import { RunState } from './RunState';

type RunButtonProps = {
  runState: RunState;
  onRun: () => void;
  onCancel?: () => void;
};

export const RunButton = ({ runState, onRun, onCancel }: RunButtonProps) => {
  if (runState === RunState.RUNNING) {
    return (
      <Button variant={onCancel ? 'danger' : 'primary'} disabled={!onCancel} onClick={onCancel}>
        {onCancel ? 'Cancel' : 'Running...'}
      </Button>
    );
  }

  return (
    <Button variant="primary" onClick={onRun}>
      {runState === RunState.COMPLETE ? 'Run again' : 'Click to run'}
    </Button>
  );
};

