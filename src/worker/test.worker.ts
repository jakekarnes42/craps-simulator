declare const self: DedicatedWorkerGlobalScope;
export default {} as typeof Worker & { new (): Worker };

self.onmessage = async ($event: MessageEvent) => {
    console.log("Handling event");
    if ($event && $event.data && $event.data.msg === 'run') {
        console.log("Matched event");
        console.log("Starting first sort");
        const output = simulate();
        self.postMessage(output);
        console.log("Starting second sort");
        const output2 = simulate();
        self.postMessage(output2);
        console.log("All done");
        self.postMessage("Done");
    }
};

function simulate() {
    const bubleSort = (input: number[]) => {
        let swap;
        let n = input.length - 1;
        const sortedArray = input.slice();
        do {
            swap = false;
            for (let index = 0; index < n; index += 1) {
                if (sortedArray[index] > sortedArray[index + 1]) {
                    const tmp = sortedArray[index];
                    sortedArray[index] = sortedArray[index + 1];
                    sortedArray[index + 1] = tmp;
                    swap = true;
                }
            }
            n -= 1;
        } while (swap);

        return sortedArray;
    };

    const numbers = [...Array(50000)].map(() =>
        Math.floor(Math.random() * 1000000)
    );
    const sorted = bubleSort(numbers);
    const output = sorted[0];
    console.log(`Completed sort ${output}`);

    return output;

}