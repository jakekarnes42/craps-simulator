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

        let gameState = GameState.init(configuration);
        while (!gameState.isDone()) {
            //Execute a single roll
            const output = executeSingleRoll(gameState);
            //Single roll complete. Send result
            self.postMessage(output);
            gameState = output.resultingState;
        }

        //All done. Send results
        self.postMessage("Done");
    }
};
