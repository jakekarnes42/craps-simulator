import { Configuration } from "../game/Configuration";
import { GameState } from "../game/GameState";
import { executeSingleRoll, SessionAnalytics, BetType, BetOutcome } from "../game/Session";

self.onmessage = async ($event: MessageEvent) => {
    if ($event && $event.data) {
        //Convert configuration back into a proper class instance.
        //It gets boiled down to JSON in the message passing.
        const configuration = new Configuration($event.data.configuration);
        const simCount = $event.data.simCount;
        const results: SessionAnalytics[] = [];
        
        for (let i = 0; i < simCount; i++) {
            let gameState = GameState.init(configuration);
            
            let highestBankroll = configuration.initialBankroll ?? 0;
            let maxDrawdown = 0;
            let sevenOutCount = 0;
            let totalSevenOutWipe = 0;
            let rollCount = 0;
            
            // Initialize bet attribution
            const betAttribution: Record<BetType, { won: number; lost: number }> = {
                [BetType.PASSLINE]: { won: 0, lost: 0 },
                [BetType.PASSLINE_ODDS]: { won: 0, lost: 0 },
                [BetType.DONTPASS]: { won: 0, lost: 0 },
                [BetType.DONTPASS_ODDS]: { won: 0, lost: 0 },
                [BetType.COME]: { won: 0, lost: 0 },
                [BetType.COME_ODDS]: { won: 0, lost: 0 },
                [BetType.DONTCOME]: { won: 0, lost: 0 },
                [BetType.DONTCOME_ODDS]: { won: 0, lost: 0 },
                [BetType.NUMBER_BET]: { won: 0, lost: 0 }
            };

            while (!gameState.isDone()) {
                const output = executeSingleRoll(gameState);
                rollCount++;
                
                // Track Drawdown
                if (output.resultingState.bankroll > highestBankroll) {
                    highestBankroll = output.resultingState.bankroll;
                }
                const currentDrawdown = highestBankroll - output.resultingState.bankroll;
                if (currentDrawdown > maxDrawdown) {
                    maxDrawdown = currentDrawdown;
                }
                
                // Track 7-Out Cost
                const isSevenOut = gameState.pointIsOn && output.roll === 7;
                if (isSevenOut) {
                    sevenOutCount++;
                    let wipeAmount = 0;
                    for (const rb of output.resolvedBets) {
                        if (rb.outcome === BetOutcome.LOSS) {
                            wipeAmount += rb.placedBet.bet;
                        }
                    }
                    totalSevenOutWipe += wipeAmount;
                }
                
                // Track Bet Attribution
                for (const rb of output.resolvedBets) {
                    const type = rb.placedBet.type;
                    if (rb.outcome === BetOutcome.WIN) {
                        betAttribution[type].won += rb.payout;
                    } else if (rb.outcome === BetOutcome.LOSS) {
                        betAttribution[type].lost += rb.placedBet.bet;
                    }
                }
                
                gameState = output.resultingState;
            }
            
            results.push({
                finalState: gameState,
                rollCount,
                maxDrawdown,
                sevenOutCount,
                totalSevenOutWipe,
                betAttribution
            });

            //Send update
            if ((i + 1) % 1000 === 0) {
                self.postMessage("1000 complete");
            }
        }

        //All done. Send results
        self.postMessage(results);
    }
};
