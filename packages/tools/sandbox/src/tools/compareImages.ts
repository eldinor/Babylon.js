import * as pixelmatch from "pixelmatch";

interface IpmResult {
    pm: number;
    error: number;
    dataURL: string;
}

export async function compareImages(src1: string, src2: string, threshold?: number, diffColorAltEnabled?: boolean, diffColorAlt?: [number, number, number]): Promise<IpmResult> {
    let canvas1 = document.getElementById("canvas1") as HTMLCanvasElement;
    if (!canvas1) {
        canvas1 = document.createElement("canvas");
        canvas1.id = "canvas1";
    }
    const context1 = canvas1.getContext("2d");

    let canvas2 = document.getElementById("canvas2") as HTMLCanvasElement;
    if (!canvas2) {
        canvas2 = document.createElement("canvas");
        canvas2.id = "canvas2";
    }
    const context2 = canvas2.getContext("2d");

    let canvasDiff = document.getElementById("canvasDiff") as HTMLCanvasElement;
    if (!canvasDiff) {
        canvasDiff = document.createElement("canvas");
        canvasDiff.id = "canvasDiff";
    }
    const contextD = canvasDiff.getContext("2d");

    const img1 = (await loadImage(src1)) as HTMLImageElement;
    const img2 = (await loadImage(src2)) as HTMLImageElement;
    const { width, height } = img1;

    canvas1.width = width;
    canvas1.height = height;
    context1!.drawImage(img1, 0, 0);

    canvas2.width = width;
    canvas2.height = height;
    context2!.drawImage(img2, 0, 0);

    canvasDiff.width = width;
    canvasDiff.height = height;

    const i1 = context1!.getImageData(0, 0, width, height);
    const i2 = context2!.getImageData(0, 0, width, height);
    const diff = contextD!.createImageData(width, height);

    if (!threshold) {
        threshold = 0.05;
    }

    if (diffColorAltEnabled) {
        if (!diffColorAlt) {
            diffColorAlt = [0, 255, 255];
        }
    }

    const pm = pixelmatch(i1.data, i2.data, diff.data, canvas1.width, canvas1.height, {
        threshold: threshold,
        includeAA: true,
        diffMask: true,
        diffColorAlt: diffColorAlt, //,
    });

    // console.log(pm);

    contextD!.putImageData(diff, 0, 0);

    const dataURL = canvasDiff.toDataURL();
    //   console.log(dataURL); // DIFF IMAGE

    const pmResult = {
        pm: pm,
        error: Math.round((100 * 100 * pm) / (canvas1.width * canvas1.height)) / 100,
        dataURL: dataURL,
    };

    // console.log(pmResult);

    return Promise.resolve(pmResult);
}

export const loadImage = (path: string) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // to avoid CORS if used with Canvas
        img.src = path;
        img.onload = () => {
            resolve(img);
        };
        img.onerror = (e) => {
            reject(e);
        };
    });
};
