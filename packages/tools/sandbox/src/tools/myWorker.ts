import { AutoReleaseWorkerPool } from "core/Misc/workerPool";

export async function createWorkerPool() {
    const wPool = new AutoReleaseWorkerPool(5, createWorker);

    console.log(wPool);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];

    await processWorkers(arr, wPool);
    console.log("FINISHED");
}

async function createWorker() {
    const workerContent = `(${workerFunction}())`;
    // console.log(workerContent);
    const workerBlobUrl = URL.createObjectURL(new Blob([workerContent], { type: "application/javascript" }));

    return Promise.resolve(new Worker(workerBlobUrl));
}

function workerFunction() {
    onmessage = (event) => {
        console.log("workerFunction ", event.data.encodedData);
        // Async function for testing
        let promise = new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 1000);
        });

        promise.then(() => {
            // Process data simulation
            const dData = event.data.encodedData.toUpperCase() + " - Upper Case";
            postMessage({
                action: "decoded",
                success: true,
                decodedData: dData,
            });
            console.log("DECODED");
        });
    };
}

async function processWorkers(arr: number[], wPool: any) {
    let timer = Date.now();
    console.log("Started");

    const promArr = [];
    for (const item of arr) {
        const wPromise = new Promise<void>((resolve, reject) => {
            wPool.push((worker: any, onComplete: any) => {
                worker.onerror = (error: any) => {
                    console.log("There is an error with worker!");
                    reject(error);
                    onComplete();
                };

                worker.postMessage({
                    action: "encoded",
                    success: false,
                    encodedData: "some data",
                });

                worker.onmessage = (event: MessageEvent<any>) => {
                    console.log("myWorker ", event.data.decodedData);
                    console.log(item);
                    console.log(Date.now() - timer);

                    if (event.data.success) {
                        try {
                            console.log("TRYING");
                            resolve();
                        } catch (err) {
                            reject({ message: err });
                        }
                    }
                    onComplete();
                };
            });
        });
        promArr.push(wPromise);
    }
    console.log(promArr);

    console.log(await Promise.allSettled(promArr));
    promArr.length = 0;
    console.log("FINISH SUCCESSFULLY", Date.now() - timer);
}
