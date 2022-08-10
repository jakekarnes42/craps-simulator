import { Configuration } from "../game/Configuration";
import { GameState } from "../game/GameState";
import { executeSingleRoll } from "../game/Session";

declare const self: DedicatedWorkerGlobalScope;
export default {} as typeof Worker & { new(): Worker };

self.onmessage = async ($event: MessageEvent) => {
    console.log("Handling event");
    if ($event && $event.data) {
        console.log("Matched event");
        console.log("Starting simulation");

        //Convert configuration back into a proper class instance.
        //It gets boiled down to JSON in the message passing.
        const configuration = new Configuration($event.data.configuration);

        let gameState = GameState.init(configuration);
        while (!gameState.isDone()) {
            console.log("Executing 1 roll");
            const output = executeSingleRoll(gameState);
            console.log("Executed 1 roll. Sending result");
            self.postMessage(output);
            gameState = output.resultingState;
        }

        console.log("All done");
        self.postMessage("Done");
    }
};
