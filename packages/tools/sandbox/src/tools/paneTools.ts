import { Pane } from "tweakpane";
import * as CamerakitPlugin from "@tweakpane/plugin-camerakit";

import { Scene } from "core/scene";
import { ArcRotateCamera } from "core/Cameras/arcRotateCamera";
import { CubeTexture } from "core/Materials/Textures/cubeTexture";
import { PBRMaterial } from "core/Materials/PBR/pbrMaterial";
import { CreateScreenshotAsync } from "core/Misc/screenshotTools";
import { Engine } from "core/Engines/engine";
import { DefaultRenderingPipeline } from "core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";

export function mainPane(scene: Scene) {
    const pane = new Pane({
        container: document.getElementById("paneContainer") as any,
    });
    pane.registerPlugin(CamerakitPlugin);

    // console.log(pane);

    // ##############################
    return pane;
    // mainPane end
}

export function screenshotPane() {
    const screenshotPane = new Pane({
        container: document.getElementById("paneContainerBottom") as any,
    });
    screenshotPane.registerPlugin(CamerakitPlugin);
    // console.log(screenshotPane);

    // ##############################
    return screenshotPane;
    // screenshotPane end
}
export function createPaneElements1(pane: Pane, _scene: Scene, filename: string) {
    const f1 = pane.addFolder({
        title: "Information",
    });

    // File name
    const filenameButton = f1.addBlade({
        view: "text",
        label: "File name",
        parse: (v: any) => String(v),
        value: filename,
    });
    //  console.log(filenameButton);
    f1.addSeparator();
    return filenameButton;
}

export function cameraPane(pane: Pane, scene: Scene) {
    const fCamera = pane.addFolder({
        title: "Camera",
    });

    const autoRotateButton = fCamera.addButton({
        title: "Start",
        label: "Auto Rotate", // optional
    });

    let count = 0;

    autoRotateButton.on("click", () => {
        count += 1;
        console.log(count);

        if (autoRotateButton.title === "Start") autoRotateButton.title = "Stop";
        else autoRotateButton.title = "Start";

        if (scene.activeCamera instanceof ArcRotateCamera) {
            scene.activeCamera.useAutoRotationBehavior = scene.activeCamera.useAutoRotationBehavior ? false : true;
        }
    }); // autoRotateButton END

    const constrastSlider = fCamera.addInput(
        {
            contrast: 1,
        },
        "contrast",
        {
            min: 0,
            max: 5,
            label: "Camera Contrast",
            value: scene.imageProcessingConfiguration.contrast,
        }
    );

    console.log(scene.imageProcessingConfiguration.contrast);

    constrastSlider.on("change", (ev: { value: number }) => {
        scene.imageProcessingConfiguration.contrast = ev.value;
    }); //constrastSlider END
    //

    const exposureSlider = fCamera.addInput(
        {
            exposure: 1,
        },
        "exposure",
        {
            min: 0,
            max: 5,
            label: "Camera exposure",
            value: scene.imageProcessingConfiguration.contrast,
        }
    );

    exposureSlider.on("change", (ev: { value: number }) => {
        scene.imageProcessingConfiguration.exposure = ev.value;
    }); //constrastSlider END
    //
    fCamera.addSeparator();
    return fCamera;
}

export function skyPaneElements(pane: Pane, scene: Scene, skyboxMat: PBRMaterial) {
    const fEnv = pane.addFolder({
        title: "Environment",
    });

    const skyRotateButton = fEnv.addInput(
        {
            rotation: 50,
        },
        "rotation",
        {
            min: 0,
            max: 3.14,
            label: "Sky Rotation",
            value: (scene.environmentTexture as CubeTexture).rotationY,
        }
    );

    skyRotateButton.on("change", (ev: { value: number }) => {
        //
        if (scene.environmentTexture instanceof CubeTexture) {
            scene.environmentTexture.rotationY = ev.value;
        }
    }); //skyRotateButton END

    // skyboxBlurButton
    const skyboxBlurButton = fEnv.addInput(
        {
            key: skyboxMat.microSurface,
        },
        "key",
        {
            view: "cameraring",
            label: "Sky Blur",
            series: 0,
            // Scale unit
            unit: {
                // Pixels for the unit
                pixels: 50,
                // Number of ticks for the unit
                ticks: 10,
                // Amount of a value for the unit
                value: 0.2,
            },
            // You can use `min`, `max`, `step` same as a number input
            min: 0,
            max: 1,
            step: 0.02,
            wide: true,
        }
    );
    skyboxBlurButton.on("change", (ev) => {
        skyboxMat.microSurface = ev.value;
    });
    //

    const skyLevelSlider = fEnv.addInput(
        {
            intensity: 1,
        },
        "intensity",
        {
            min: 0,
            max: 3,
            label: "Sky Intensity",
            value: scene.environmentIntensity,
        }
    );

    skyLevelSlider.on("change", (ev: { value: number }) => {
        scene.environmentIntensity = ev.value;
    }); //skyLevelSlider END

    //
    fEnv.addSeparator();
    return { skyRotateButton, skyboxBlurButton };
}
//
export function screenshotButton(pane: Pane, scene: Scene, engine: Engine, canvas: HTMLCanvasElement) {
    const ScreenshotButton = pane.addButton({
        title: "Screenshot!",
        label: "Screenshot", // optional
    });

    let count = 0;
    ScreenshotButton.on("click", () => {
        count += 1;
        console.log("ScreenshotButton", count);

        CreateScreenshotAsync(engine, scene.activeCamera as ArcRotateCamera, { width: canvas.width, height: canvas.height }, "image/png").then(
            (data) => {
                if (document.getElementById("screenshotImage")) {
                    document.getElementById("screenshotImage")?.remove();
                }

                let image = new Image();
                (image as any).src = data;
                image.id = "screenshotImage";

                document.body.appendChild(image);

                image.style.position = "absolute";
                image.style.top = "1px";
                image.style.left = "1px";
                image.style.width = canvas.width / 4 + "px";
                image.style.height = canvas.height / 4 + "px";

                console.log(image);
                //
                let saveButton = document.createElement("a");
                saveButton.innerText = "Save";
                document.body.appendChild(saveButton);
                saveButton.style.position = "absolute";
                saveButton.style.top = "2px";
                saveButton.style.left = "2px";
                saveButton.style.zIndex = "15000";
                saveButton.href = (image as any).src;

                saveButton.style.background = "#1e1d78";
                saveButton.style.color = "white";
                saveButton.style.textDecoration = "none";
                saveButton.style.display = "block";
                saveButton.style.padding = "5px";
                saveButton.style.paddingTop = "2px";

                let rnd: number = Math.floor(Math.random() * 1000);
                saveButton.download = "MockUp_" + rnd + ".png";
            }
            //
        );
    });
}

export function ppFolder(pane: Pane, scene: Scene) {
    const pipeline = scene._postProcessRenderPipelineManager.supportedPipelines[0] as DefaultRenderingPipeline;

    const fPostProcess = pane.addFolder({
        title: "Post Process",
    });

    const dofEnableButton = fPostProcess.addButton({
        title: "Enable DoF",
        label: "Depth of Field", // optional
    });

    let count = 0;
    dofEnableButton.on("click", () => {
        count += 1;
        console.log("DOF", count);

        console.log(scene._postProcessRenderPipelineManager.supportedPipelines[0]);

        pipeline.depthOfFieldEnabled = !pipeline.depthOfFieldEnabled;

        if (dofEnableButton.title === "Enable DoF") dofEnableButton.title = "Disable DoF";
        else dofEnableButton.title = "Enable DoF";
    });
    //

    //
    // dofFocalLengthRing
    const dofFocalLengthSlider = fPostProcess.addInput(
        {
            key: pipeline.depthOfField.focalLength,
        },
        "key",
        {
            //  view: "cameraring",
            label: "Focus Length",
            series: 0,
            unit: {
                pixels: 50,
                ticks: 10,
                value: 10,
            },
            min: 0,
            max: 1000,
            step: 10,
            wide: true,
        }
    );
    dofFocalLengthSlider.on("change", (ev: any) => {
        pipeline.depthOfField.focalLength = ev.value;
    });
    //

    console.log(pipeline.depthOfField.focalLength);
    // end of DOF focalLength
    //
    // dofFocalLengthRing
    const doffStopSlider = fPostProcess.addInput(
        {
            key: pipeline.depthOfField.fStop,
        },
        "key",
        {
            view: "cameraring",
            label: "Focus Length",
            series: 0,
            unit: {
                pixels: 50,
                ticks: 10,
                value: 10,
            },
            min: 0,
            max: 32,
            step: 1,
            wide: true,
        }
    );
    doffStopSlider.on("change", (ev: any) => {
        pipeline.depthOfField.fStop = ev.value;
    });
    //

    console.log(pipeline.depthOfField.fStop);
    // end of DOF fStop

    // dofDistance
    const dofDistanceSlider = fPostProcess.addInput(
        {
            key: pipeline.depthOfField.focusDistance,
        },
        "key",
        {
            //   view: "cameraring",
            label: "Focus Distance",
            min: 0,
            max: 7000,
            step: 10,
            wide: true,
        }
    );
    dofDistanceSlider.on("change", (ev: any) => {
        pipeline.depthOfField.focusDistance = ev.value;
    });
    //

    console.log(pipeline.depthOfField.focusDistance);
    // end of DOF focusDistance

    // dofLensSizeSlider
    const dofLensSizeSlider = fPostProcess.addInput(
        {
            key: pipeline.depthOfField.lensSize,
        },
        "key",
        {
            //   view: "cameraring",
            label: "Lens Size",
            min: 0,
            max: 700,
            step: 10,
            wide: true,
        }
    );
    dofLensSizeSlider.on("change", (ev: any) => {
        pipeline.depthOfField.lensSize = ev.value;
    });
    //

    console.log(pipeline.depthOfField.lensSize);
    // end of DOF focusDistance

    const vignetteButton = fPostProcess.addButton({
        title: "Enable Vignette",
        label: "Vignette", // optional
    });

    vignetteButton.on("click", () => {
        scene.imageProcessingConfiguration.vignetteEnabled = !scene.imageProcessingConfiguration.vignetteEnabled;

        if (vignetteButton.title === "Enable Vignette") vignetteButton.title = "Disable Vignette";
        else vignetteButton.title = "Enable Vignette";
    });
    //

    // vignetteWeightSlider
    const vignetteWeightSlider = fPostProcess.addInput(
        {
            key: scene.imageProcessingConfiguration.vignetteWeight,
        },
        "key",
        {
            //   view: "cameraring",
            label: "Lens Size",
            min: 0,
            max: 200,
            step: 1,
            wide: true,
        }
    );
    vignetteWeightSlider.on("change", (ev: any) => {
        scene.imageProcessingConfiguration.vignetteWeight = ev.value;
    });
    //

    console.log(scene.imageProcessingConfiguration.vignetteWeight);
    // end of vignetteWeightSlider
    //
    return fPostProcess;
    //
}
