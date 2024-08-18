//
//
export function initializeWebWorker(worker: Worker): Promise<Worker> {
    return new Promise((resolve, reject) => {
        const onError = (error: ErrorEvent) => {
            worker.removeEventListener("error", onError);
            worker.removeEventListener("message", onMessage);
            reject(error);
        };

        const onMessage = (message: MessageEvent) => {
            if (message.data.action === "init") {
                worker.removeEventListener("error", onError);
                worker.removeEventListener("message", onMessage);
                resolve(worker);
            }
        };

        worker.addEventListener("error", onError);
        worker.addEventListener("message", onMessage);

        worker.postMessage({
            action: "init",
        });
    });
}

export function workerFunction(KTX2DecoderModule?: any): void {
    onmessage = (event) => {
        //   console.log("MESSAGE GOT");
        if (!event.data) {
            return;
        }
        console.log(event.data.action);
        // console.log(event.data.options);
        switch (event.data.action) {
            case "init": {
                console.log("CASE INIT");
            }

            case "decode":
                postMessage({ action: "decoded", success: true, decodedData: "weryui weroijuwer" });
                console.log("DECODED");

                break;
        }
    };
}
