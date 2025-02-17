import { Configuration } from "../game/Configuration";
import { GameState } from "../game/GameState";
import { executeSingleRoll } from "../game/Session";

declare const self: DedicatedWorkerGlobalScope;
export default {} as typeof Worker & { new(): Worker };

self.onmessage = async ($event: MessageEvent) => {
    if ($event && $event.data) {
        //Convert configuration back into a proper class instance.
        //It gets boiled down to JSON in the message passing.
        const configuration = new Configuration($event.data.configuration);
        const simCount = $event.data.simCount;
        const results = [];
        for (let i = 0; i < simCount; i++) {
            let gameState = GameState.init(configuration);
            while (!gameState.isDone()) {
                const output = executeSingleRoll(gameState);
                gameState = output.resultingState;
            }
            results.push(gameState);

            //Send update
            if ((i + 1) % 1000 === 0) {
                self.postMessage("1000 complete");
            }
        }

        //All done. Send results
        self.postMessage(results);
    }
};
