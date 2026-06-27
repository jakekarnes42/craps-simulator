import { Configuration } from "../../../engine/Configuration";
import { GameState, sumBetCollection } from "../../../engine/GameState";
import { BetOutcome, createEmptyBetAttribution, executeSingleRoll } from "../../../engine/Session";
import type { SessionAnalyticsSnapshot } from "../../../engine/Session";
import { BULK_PROGRESS_BATCH_SIZE } from "./workerMessages";
import type { BulkSimulationWorkerInput, BulkSimulationWorkerMessage } from "./workerMessages";

self.onmessage = ($event: MessageEvent<BulkSimulationWorkerInput>) => {
    const { configuration: configurationInput, simCount } = $event.data;
    const configuration = new Configuration(configurationInput);
    const results: SessionAnalyticsSnapshot[] = [];

    for (let i = 0; i < simCount; i++) {
        let gameState = GameState.init(configuration);

        let peakEquity = configuration.initialBankroll ?? 0;
        let maxDrawdown = 0;
        let rollCount = 0;

        const betAttribution = createEmptyBetAttribution();

        while (!gameState.isDone()) {
            const output = executeSingleRoll(gameState);
            rollCount++;

            const equity = output.resultingState.bankroll + sumBetCollection(output.resultingState.currentBets);
            if (equity > peakEquity) {
                peakEquity = equity;
            }

            const currentDrawdown = peakEquity - equity;
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
            }

            for (const resolvedBet of output.resolvedBets) {
                const type = resolvedBet.placedBet.type;
                betAttribution[type].wagered += resolvedBet.placedBet.bet;
                if (resolvedBet.outcome === BetOutcome.WIN) {
                    betAttribution[type].won += resolvedBet.payout;
                } else if (resolvedBet.outcome === BetOutcome.LOSS) {
                    betAttribution[type].lost += resolvedBet.placedBet.bet;
                }
            }

            gameState = output.resultingState;
        }

        results.push({
            finalState: gameState.toSnapshot(),
            stopReason: gameState.limitReached()!,
            rollCount,
            maxDrawdown,
            betAttribution,
        });

        if ((i + 1) % BULK_PROGRESS_BATCH_SIZE === 0) {
            self.postMessage({ type: 'progress', completed: BULK_PROGRESS_BATCH_SIZE } satisfies BulkSimulationWorkerMessage);
        }
    }

    self.postMessage({ type: 'complete', results } satisfies BulkSimulationWorkerMessage);
};
