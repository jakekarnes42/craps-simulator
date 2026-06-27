import type { ConfigurationProps } from "../../../engine/Configuration";
import type { SessionAnalyticsSnapshot } from "../../../engine/Session";

export const BULK_PROGRESS_BATCH_SIZE = 100;

export type BulkSimulationWorkerInput = {
    configuration: ConfigurationProps;
    simCount: number;
};

export type BulkSimulationWorkerMessage =
    | { type: 'progress'; completed: number }
    | { type: 'complete'; results: SessionAnalyticsSnapshot[] };
