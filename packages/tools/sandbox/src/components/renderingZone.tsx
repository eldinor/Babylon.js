import * as React from "react";
import type { GlobalState } from "../globalState";

import { Engine } from "core/Engines/engine";
import { WebGPUEngine } from "core/Engines/webgpuEngine";
import { SceneLoader } from "core/Loading/sceneLoader";
import { GLTFFileLoader } from "loaders/glTF/glTFFileLoader";
import { Scene } from "core/scene";
import type { Vector3 } from "core/Maths/math.vector";
import type { ArcRotateCamera } from "core/Cameras/arcRotateCamera";
import type { FramingBehavior } from "core/Behaviors/Cameras/framingBehavior";
import { EnvironmentTools } from "../tools/environmentTools";
import { Tools } from "core/Misc/tools";
import { FilesInput } from "core/Misc/filesInput";
import { Animation } from "core/Animations/animation";
import { CreatePlane } from "core/Meshes/Builders/planeBuilder";

import "core/Helpers/sceneHelpers";

import "../scss/renderingZone.scss";
import { PBRBaseMaterial } from "core/Materials/PBR/pbrBaseMaterial";
import { Texture } from "core/Materials/Textures/texture";
import { PBRMaterial } from "core/Materials/PBR/pbrMaterial";
//
import { WebIO, Logger, ImageUtils } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRTextureBasisu } from "@gltf-transform/extensions";
//@ts-ignore
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

// import {DracoDecoderModule} from "draco3dgltf";
//@ts-ignore
import { inspect, textureCompress, dedup, join, weld, prune, resample, instance, quantize, reorder, simplify, flatten, meshopt, listTextureSlots } from "@gltf-transform/functions";
import { Viewport } from "core/Maths/math.viewport";
// import { compareImages } from "../tools/compareImages";

import { Pane } from "tweakpane";

import * as ktx from "ktx2-encoder";
import { ktxfix } from "../tools/ktxfix";
import { GLTF2Export } from "serializers/glTF/2.0";
/*
import {
    KHR_DF_PRIMARIES_BT709,
    KHR_DF_PRIMARIES_UNSPECIFIED,
    read,
    write,
  } from "ktx-parse";
*/
function isTextureAsset(name: string): boolean {
    const queryStringIndex = name.indexOf("?");
    if (queryStringIndex !== -1) {
        name = name.substring(0, queryStringIndex);
    }

    return (
        name.endsWith(".ktx") ||
        name.endsWith(".ktx2") ||
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".webp") ||
        name.endsWith(".avif")
    );
}

interface IRenderingZoneProps {
    globalState: GlobalState;
    assetUrl?: string;
    autoRotate?: boolean;
    cameraPosition?: Vector3;
    expanded: boolean;
    reimport: boolean;
    reimportMessage: string;
}

export class RenderingZone extends React.Component<IRenderingZoneProps> {
    private _currentPluginName?: string;
    private _engine: Engine;
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _originBlob: Blob;
    // private _originFilename: string;
    private errorNum: number;
    private reImport: boolean;

    public constructor(props: IRenderingZoneProps) {
        super(props);
        this.reImport = false;
    }

    async initEngine() {
        const useWebGPU = location.href.indexOf("webgpu") !== -1 && !!(navigator as any).gpu;
        // TODO - remove this once not needed anymore. Spoofing Safari 15.4.X
        const antialias = this.props.globalState.commerceMode ? false : undefined;

        this._canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        if (useWebGPU) {
            this._engine = new WebGPUEngine(this._canvas, {
                enableAllFeatures: true,
                setMaximumLimits: true,
                antialias,
                useHighPrecisionMatrix: true,
            });
            await (this._engine as WebGPUEngine).initAsync();
        } else {
            this._engine = new Engine(this._canvas, antialias, {
                useHighPrecisionMatrix: true,
                premultipliedAlpha: false,
                preserveDrawingBuffer: true,
                antialias: antialias,
                forceSRGBBufferSupportState: this.props.globalState.commerceMode,
            });
        }

        this._engine.loadingUIBackgroundColor = "#2A2342";
        //     console.log(this.reImport)

        //
        //

        //  Prepare optimization props
        function parseBool(val: any) {
            return val === true || val === "true";
        }
        //

        //  console.log("compressionLevel ", this.props.globalState.compressionLevel)
        //
        //

        const getResizeValue = localStorage.getItem("resizeValue");

        if (getResizeValue) {
            this.props.globalState.resizeValue = getResizeValue;
        } else {
            this.props.globalState.resizeValue = "No Resize";
        }

        //    console.log("getResizeValue", getResizeValue);
        //
        const getTextureValue = localStorage.getItem("textureValue");

        if (getTextureValue) {
            this.props.globalState.textureValue = getTextureValue;
        } else {
            this.props.globalState.textureValue = "webp";
        }

        //
        const getDedupState = localStorage.getItem("dedupState");
        //    console.log(getDedupState);

        if (getDedupState) {
            this.props.globalState.dedupState = parseBool(getDedupState);

            //      console.log("parsed from Local Storage, dedupState is", this.props.globalState.dedupState);
        }

        //   console.log("Default dedup should be true", this.props.globalState.dedupState);

        //

        const getPruneState = localStorage.getItem("pruneState");
        //  console.log("getPruneState", getPruneState);

        if (getPruneState) {
            this.props.globalState.pruneState = parseBool(getPruneState);

            //  console.log("parsed from Local Storage, pruneState is", this.props.globalState.pruneState);
        }

        //  console.log("No stored PRUNE value found", this.props.globalState.pruneState);

        // end prune

        const getFlattenState = localStorage.getItem("flattenState");
        // console.log("getFlattenState", getFlattenState);

        if (getFlattenState) {
            this.props.globalState.flattenState = parseBool(getFlattenState);

            //  console.log("parsed from Local Storage, flattenState is", this.props.globalState.flattenState);
        }

        //  console.log("No stored FLATTEN value found", this.props.globalState.flattenState);
        //
        //
        const getJoinState = localStorage.getItem("joinState");
        //   console.log("getJoinState", getJoinState);

        if (getJoinState) {
            this.props.globalState.joinState = parseBool(getJoinState);

            //   console.log("parsed from Local Storage, joinState is", this.props.globalState.joinState);
        }

        //  console.log("No stored JOIN value found", this.props.globalState.joinState);
        //
        const getResampleState = localStorage.getItem("resampleState");
        //  console.log("getResampleState", getResampleState);

        if (getResampleState) {
            this.props.globalState.resampleState = parseBool(getResampleState);

            //   console.log("parsed from Local Storage, resampleState is", this.props.globalState.resampleState);
        }

        //   console.log("No stored resampleState  found", this.props.globalState.resampleState);

        // end resampleState
        //
        const getWeldState = localStorage.getItem("weldState");
        //  console.log("getWeldState", getWeldState);

        if (getWeldState) {
            this.props.globalState.weldState = parseBool(getWeldState);

            //     console.log("parsed from Local Storage, flattenState is", this.props.globalState.weldState);
        }

        //   console.log("No stored WELD State value found", this.props.globalState.weldState);

        //
        const getWeldTolerance = localStorage.getItem("weldTolerance");
        //   console.log("getWeldTolerance", getWeldTolerance);

        if (getWeldTolerance) {
            this.props.globalState.weldTolerance = Number(getWeldTolerance);

            //      console.log("parsed from Local Storage, weldTolerance is", this.props.globalState.weldTolerance);
        }

        //  console.log("No stored getWeldTolerance value found", this.props.globalState.weldTolerance);
        //

        const getWeldToleranceNormal = localStorage.getItem("weldToleranceNormal");
        //  console.log("getWeldToleranceNormal", getWeldToleranceNormal);

        if (getWeldToleranceNormal) {
            this.props.globalState.weldToleranceNormal = Number(getWeldToleranceNormal);

            //     console.log("parsed from Local Storage, weldTolerance is", this.props.globalState.weldToleranceNormal);
        } else {
            //     console.log("No stored getWeldTolerance value found", this.props.globalState.weldToleranceNormal);
        }

        //
        const getSimplifyState = localStorage.getItem("simplifyState");
        //   console.log("getSimplifyState", getSimplifyState);

        if (getSimplifyState) {
            this.props.globalState.simplifyState = parseBool(getSimplifyState);
        }

        // end SIMPLIFY

        const getReorderState = localStorage.getItem("reorderState");

        if (getReorderState) {
            this.props.globalState.reorderState = parseBool(getReorderState);
        }

        // end reorderState

        const getQuantizeState = localStorage.getItem("quantizeState");

        if (getQuantizeState) {
            this.props.globalState.quantizeState = parseBool(getQuantizeState);
        }

        // end Quantize

        const getQualityLevel = localStorage.getItem("qualityLevel");

        if (getQualityLevel) {
            this.props.globalState.qualityLevel = Number(getQualityLevel);
        }

        //

        let getCompressionLevel = localStorage.getItem("compressionLevel");

        /*
        if (isNaN(getCompressionLevel as any)) {
            getCompressionLevel = "2"
          }
*/
        if (getCompressionLevel) {
            this.props.globalState.compressionLevel = Number(getCompressionLevel);
        } else {
            this.props.globalState.compressionLevel = 2;
        }
        //
        //
        const getNeedSupercompression = localStorage.getItem("needSupercompression");

        if (getNeedSupercompression) {
            this.props.globalState.needSupercompression = parseBool(getNeedSupercompression);
        }
        //
        //
        //
        // Resize
        window.addEventListener("resize", () => {
            this._engine.resize();
        });

        this.loadAsset();

        // File inputs
        const filesInput = new FilesInput(
            this._engine,
            null,
            (sceneFile: File, scene: Scene) => {
                this._scene = scene;
                this.onSceneLoaded(sceneFile.name);
            },
            null,
            null,
            null,
            () => {
                Tools.ClearLogCache();
                if (this._scene) {
                    this.props.globalState.isDebugLayerEnabled = this.props.globalState.currentScene.debugLayer.isVisible();

                    if (this.props.globalState.isDebugLayerEnabled) {
                        this._scene.debugLayer.hide();
                    }
                }
            },
            null,
            (file, scene, message) => {
                this.props.globalState.onError.notifyObservers({ message: message });
            }
        );

        filesInput.onProcessFileCallback = (file, name, extension, setSceneFileToLoad) => {
            if (filesInput.filesToLoad && filesInput.filesToLoad.length === 1 && extension) {
                switch (extension.toLowerCase()) {
                    case "dds":
                    case "env":
                    case "hdr": {
                        FilesInput.FilesToLoad[name] = file;
                        EnvironmentTools.SkyboxPath = "file:" + (file as any).correctName;
                        return false;
                    }
                    default: {
                        if (isTextureAsset(name)) {
                            setSceneFileToLoad(file);
                        }

                        break;
                    }
                }
            }

            return true;
        };

        filesInput.loadAsync = async (sceneFile, onProgress) => {
            const filesToLoad = filesInput.filesToLoad;
            if (filesToLoad.length === 1) {
                const fileName = (filesToLoad[0] as any).correctName;

   
                if (isTextureAsset(fileName)) {
                    return Promise.resolve(this.loadTextureAsset(`file:${fileName}`));
                }
            }

            this._engine.clearInternalTexturesCache();
            //
            //
            this._originBlob = new Blob([filesToLoad[0]]);

            console.log(filesToLoad)

            //   console.log("filesToLoad[0]", filesToLoad[0] )

            this.props.globalState.origFilename = (filesToLoad[0] as any).correctName;

            if(this.props.globalState.origFilename.includes(".gltf")){
          //      console.log("INCLUDES GLTF")
                this.reImport = true
            }


            if(this.props.globalState.origFilename.includes(".obj")){
                console.log("OBJ DETECTED")
                document.getElementById("topInfo2")!.style.display = "block";
                document.getElementById("topInfo2")!.innerHTML += "For OBJ files the pixel comparison function has no sense due to the different character of materials.<br/> ";
                setTimeout(() => {
                    document.getElementById("topInfo2")!.style.display = "none";
                    document.getElementById("topInfo2")!.innerHTML = "";
                }, 4000);
            }



            /*
           let extension = this._originFilename.split('.').pop();
           console.log(extension)


           console.log(this._originFilename.replace(/\.[^/.]+$/, ""))
           console.log(this._originFilename)
           */
            //
            //

            return SceneLoader.LoadAsync("file:", sceneFile, this._engine, onProgress);
        };

        filesInput.monitorElementForDragNDrop(this._canvas);

        this.props.globalState.filesInput = filesInput;

        window.addEventListener("keydown", (event) => {
            // Press R to reload
            if (event.keyCode === 82 && event.target && (event.target as HTMLElement).nodeName !== "INPUT" && this._scene) {
                if (this.props.assetUrl) {
                    this.loadAssetFromUrl();
                } else {
                    filesInput.reload();
                }
            }
        });
    }

    prepareCamera() {
        // Attach camera to canvas inputs
        if (!this._scene.activeCamera) {
            this._scene.createDefaultCamera(true);

            const camera = this._scene.activeCamera! as ArcRotateCamera;

            if (this._currentPluginName === "gltf") {
                // glTF assets use a +Z forward convention while the default camera faces +Z. Rotate the camera to look at the front of the asset.
                camera.alpha += Math.PI;
            }

            // Enable camera's behaviors
            camera.useFramingBehavior = true;

            const framingBehavior = camera.getBehaviorByName("Framing") as FramingBehavior;
            framingBehavior.framingTime = 0;
            framingBehavior.elevationReturnTime = -1;

            if (this._scene.meshes.length) {
                camera.lowerRadiusLimit = null;

                const worldExtends = this._scene.getWorldExtends(function (mesh) {
                    return mesh.isVisible && mesh.isEnabled();
                });
                framingBehavior.zoomOnBoundingInfo(worldExtends.min, worldExtends.max);
            }

            if (this.props.autoRotate) {
                camera.useAutoRotationBehavior = true;
            }

            if (this.props.cameraPosition) {
                camera.setPosition(this.props.cameraPosition);
            }

            camera.pinchPrecision = 200 / camera.radius;
            camera.upperRadiusLimit = 5 * camera.radius;

            camera.wheelDeltaPercentage = 0.01;
            camera.pinchDeltaPercentage = 0.01;

            //     camera.lowerRadiusLimit = 1;

            camera.viewport = new Viewport(0, 0, 0.5, 1.0);

            const camera2 = camera.clone("camera2");
            //            const camera2 = new ArcRotateCamera('camera2',1,1,5,Vector3.Zero() )

            this._scene.activeCameras!.push(camera);
            this._scene.activeCameras!.push(camera2);

            camera2.viewport = new Viewport(0.5, 0, 0.5, 1.0);
            camera2.attachControl();

            camera2.layerMask = 0x20000000;

            this._scene.onBeforeCameraRenderObservable.add(function () {
                (camera2 as any).alpha = (camera as any).alpha;
                (camera2 as any).beta = (camera as any).beta;
                (camera2 as any).radius = (camera as any).radius;
                (camera2 as any).target = (camera as any).target;
            });
        }

        this._scene.activeCamera!.attachControl();
    }

    handleErrors() {
        // In case of error during loading, meshes will be empty and clearColor is set to red
        if (this._scene.meshes.length === 0 && this._scene.clearColor.r === 1 && this._scene.clearColor.g === 0 && this._scene.clearColor.b === 0) {
            this._canvas.style.opacity = "0";
            this.props.globalState.onError.notifyObservers({ scene: this._scene, message: "No mesh found in your scene" });
        } else {
            if (Tools.errorsCount > 0) {
                this.props.globalState.onError.notifyObservers({ scene: this._scene, message: "Scene loaded but several errors were found" });
            }
            //    this._canvas.style.opacity = "1";
            const camera = this._scene.activeCamera! as ArcRotateCamera;
            if (camera.keysUp) {
                camera.keysUp.push(90); // Z
                camera.keysUp.push(87); // W
                camera.keysDown.push(83); // S
                camera.keysLeft.push(65); // A
                camera.keysLeft.push(81); // Q
                camera.keysRight.push(69); // E
                camera.keysRight.push(68); // D
            }
        }
    }

    prepareLighting() {
        if (this._currentPluginName === "gltf") {
            if (!this._scene.environmentTexture) {
                this._scene.environmentTexture = EnvironmentTools.LoadSkyboxPathTexture(this._scene);
            }

            if (this._scene.environmentTexture && this.props.globalState.skybox) {
                this._scene.createDefaultSkybox(this._scene.environmentTexture, true, (this._scene.activeCamera!.maxZ - this._scene.activeCamera!.minZ) / 2, 0.3, false);
            }
        } else {
            let pbrPresent = false;
            for (const material of this._scene.materials) {
                if (material instanceof PBRBaseMaterial) {
                    pbrPresent = true;
                    break;
                }
            }

            if (pbrPresent) {
                if (!this._scene.environmentTexture) {
                    this._scene.environmentTexture = EnvironmentTools.LoadSkyboxPathTexture(this._scene);
                }
            } else {
                this._scene.createDefaultLight();
            }
        }

        this._scene.onAfterRenderObservable.add(() => {
            if (!this.props.globalState.skybox) {
                this._scene.meshes.forEach((m) => {
                    if (m.name.includes("hdrSky")) {
                        m.setEnabled(false);
                    }
                });
            } else {
                this._scene.meshes.forEach((m) => {
                    if (m.name.includes("hdrSky")) {
                        m.setEnabled(true);
                    }
                });
            }
        });
    }

    async onSceneLoaded(filename: string) {
        this._scene.skipFrustumClipping = true;

        this.props.globalState.onSceneLoaded.notifyObservers({ scene: this._scene, filename: filename });

        this.prepareCamera();
        this.prepareLighting();
        this.handleErrors();

        this._scene.onPointerObservable.add(function (ev) {
          //  console.log(ev);
            //    document.getElementById("ktx-container")!.style.display = "none";

            if (ev.type == 1) {
             //   console.log("CLICK");
                if (document.getElementById("settings-container")) {
                    if (document.getElementById("settings-container")!.style.display !== "none") {
                        document.getElementById("settings-container")!.style.display = "none";
                    }
                }

                if (document.getElementById("help-container")) {
                    if (document.getElementById("help-container")!.style.display !== "none") {
                        document.getElementById("help-container")!.style.display = "none";
                    }
                }
            } //
        });

        if (this._scene.getMeshByName("hdrSkyBox")) {
            const hdrSkyBox2 = (this._scene.getMeshByName("hdrSkyBox") as any).createInstance("hdrSkyBox2");
            hdrSkyBox2.layerMask = 0x20000000;
        }

        if (this.props.globalState.isDebugLayerEnabled) {
            this.props.globalState.showDebugLayer();
        }

        delete this._currentPluginName;
        //
        //
        //     console.log(this.reImport);

        // Add here processing for Draco, ktx extensions and OBJ, BABYLON files

        let camera1 = this._scene.getCameraByName("default camera");
        let camera2 = this._scene.getCameraByName("default camera");

        let hdrSkyBox = this._scene.getMeshByName("hdrSkyBox");
        let hdrSkyBox2 = this._scene.getMeshByName("hdrSkyBox2");

        let options = {
            shouldExportNode: function (node: any) {
                return node !== camera1 && node !== camera2 && node !== hdrSkyBox && node !== hdrSkyBox2;
            },
        };
        //    console.log(options);
        //

        if (this.reImport) {
            const exportScene = await GLTF2Export.GLBAsync(this._scene, "fileName", options);
            const blob = exportScene.glTFFiles["fileName" + ".glb"];

            //        console.log(blob);

            this._originBlob = blob as Blob;
        }

        //
        //  The beginning
        const arr = new Uint8Array(await this._originBlob.arrayBuffer());
        document.getElementById("topLeft")!.innerHTML = this.props.globalState.origFilename;
        document.getElementById("topLeft")!.innerHTML += " | ";
        document.getElementById("topLeft")!.innerHTML += "<strong>" + (arr.length / (1024 * 1024)).toFixed(2).toString() + " Mb</strong>";

        const io = new WebIO().registerExtensions(ALL_EXTENSIONS);

        const doc = await io.readBinary(arr);

        doc.setLogger(new Logger(Logger.Verbosity.DEBUG));

        //   console.log(inspect(doc));
        let totalVRAM = 0;
        let hasKTX = false;

        doc.getRoot()
            .listTextures()
            .forEach((tex) => {
                const vram = ImageUtils.getVRAMByteLength(tex.getImage()!, tex.getMimeType());

                //  console.log("VRAM: " + vram)
                totalVRAM += vram!;

                if (tex.getMimeType().includes("ktx")) {
                    hasKTX = true;
                }
            });

        if (hasKTX) {
            console.log("KTX FOUND!!!");
            this.props.globalState.resizeValue = "No Resize";
            this.props.globalState.textureValue = "Keep Original";
            document.getElementById("topInfo2")!.style.display = "block";
            document.getElementById("topInfo2")!.innerHTML += "KTX Texture detected. <br/>Texture settings changed to No Resize and Keep Original format.<br/> ";
            setTimeout(() => {
                document.getElementById("topInfo2")!.style.display = "none";
                document.getElementById("topInfo2")!.innerHTML = "";
            }, 4000);
        }

        //    console.log("TOTAL VRAM " + niceBytes(totalVRAM))

        document.getElementById("topLeft")!.innerHTML += " | Texture VRAM " + niceBytes(totalVRAM);
        //   console.log(doc.getRoot().getAsset());

        await MeshoptEncoder.ready;
        //
        //
        // PANE

        const pane = new Pane({ container: document.getElementById("settings")! });

        this._scene.onDispose = () => {
            pane.dispose();
        };

        const f0 = pane.addFolder({
            title: "Basic Optimization",
        });

        const dedupPane = f0.addBinding({ Dedup: this.props.globalState.dedupState }, "Dedup", {
            label: "Dedup",
        });

        dedupPane.on("change", (ev) => {
            //   console.log(ev.value);
            this.props.globalState.dedupState = ev.value;
            localStorage.setItem("dedupState", ev.value.toString());
        });

        const prunePane = f0.addBinding({ Prune: this.props.globalState.pruneState }, "Prune", {
            label: "Prune",
        });

        prunePane.on("change", (ev) => {
            //   console.log("prunePane ", ev.value);
            this.props.globalState.pruneState = ev.value;
            localStorage.setItem("pruneState", ev.value.toString());
        });

        const flattenPane = f0.addBinding({ Flatten: this.props.globalState.flattenState }, "Flatten", {
            label: "Flatten",
        });

        flattenPane.on("change", (ev) => {
            //   console.log("flattenPane ", ev.value);
            this.props.globalState.flattenState = ev.value;
            localStorage.setItem("flattenState", ev.value.toString());
        });

        const joinPane = f0.addBinding({ Join: this.props.globalState.joinState }, "Join", {
            label: "Join",
        });

        joinPane.on("change", (ev) => {
            //   console.log("joinPane ", ev.value);
            this.props.globalState.joinState = ev.value;
            localStorage.setItem("joinState", ev.value.toString());
        });
        //

        const resamplePane = f0.addBinding({ Resample: this.props.globalState.resampleState }, "Resample", {
            label: "Resample Animations",
        });

        resamplePane.on("change", (ev) => {
            //    console.log("resamplePane ", ev.value);
            this.props.globalState.resampleState = ev.value;
            localStorage.setItem("resampleState", ev.value.toString());
        });

        //
        f0.addBlade({
            view: "separator",
        });
        const weldPane = f0.addBinding({ Weld: this.props.globalState.weldState }, "Weld", {
            label: "Weld",
        });

        weldPane.on("change", (ev) => {
            //    console.log("weldPane ", ev.value);
            this.props.globalState.weldState = ev.value;
            localStorage.setItem("weldState", ev.value.toString());
        });

        const weldTolerancePane = f0.addBinding({ Tolerance: this.props.globalState.weldTolerance }, "Tolerance", {
            label: "Tolerance | Default 0.001",
            format: (v) => v.toFixed(3),
        });

        weldTolerancePane.on("change", (ev) => {
            //    console.log("weldTolerancePane ", ev.value);
            this.props.globalState.weldTolerance = ev.value;
            localStorage.setItem("weldTolerance", ev.value.toString());
        });

        const weldToleranceNormalPane = f0.addBinding({ ToleranceNormal: this.props.globalState.weldToleranceNormal }, "ToleranceNormal", {
            label: "Tolerance Normal| Default 0.25",
            format: (v) => v.toFixed(2),
        });

        weldToleranceNormalPane.on("change", (ev) => {
            //    console.log("weldToleranceNormalPane ", ev.value);
            this.props.globalState.weldToleranceNormal = ev.value;
            localStorage.setItem("weldToleranceNormal", ev.value.toString());
        });

        f0.addBlade({
            view: "separator",
        });

        const simplifyPane = f0.addBinding({ Simplify: this.props.globalState.simplifyState }, "Simplify", {
            label: "Simplify | MeshoptSimplifier",
        });

        simplifyPane.on("change", (ev) => {
            //    console.log("simplifyPane ", ev.value);
            this.props.globalState.simplifyState = ev.value;
            localStorage.setItem("simplifyState", ev.value.toString());
        });
        //

        //

        //

        //
        const f1 = pane.addFolder({
            title: "KHR Extensions",
        });

        const reorderPane = f1.addBinding({ Reorder: this.props.globalState.reorderState }, "Reorder", {
            label: "Reorder | EXT_meshopt_compression",
        });

        reorderPane.on("change", (ev) => {
            //   console.log("reorderPane ", ev.value);
            this.props.globalState.reorderState = ev.value;
            localStorage.setItem("reorderState", ev.value.toString());
        });

        // this.props.globalState.textureValue == "ktx2/MIX"

        const quantizePane = f1.addBinding({ Quantize: this.props.globalState.quantizeState }, "Quantize", {
            label: "Quantize | KHR_mesh_quantization",
        });

        quantizePane.on("change", (ev) => {
            //   console.log("quantizePane ", ev.value);
            this.props.globalState.quantizeState = ev.value;
            localStorage.setItem("quantizeState", ev.value.toString());
        });
        //
        const fKTX = pane.addFolder({
            title: "KTX2 Compression",
        });

        const qualityLevelPane = fKTX.addBinding({ qualityLevel: this.props.globalState.qualityLevel }, "qualityLevel", {
            min: 1,
            max: 255,
            step: 1,
            label: "ETC1S Quality Level (255 = best)",
        });

        qualityLevelPane.on("change", (ev) => {
            this.props.globalState.qualityLevel = ev.value;
            localStorage.setItem("qualityLevel", ev.value.toString());
        });

        //
        //
        const cpLevelPane = fKTX.addBinding({ compressionLevel: this.props.globalState.compressionLevel }, "compressionLevel", {
            min: 0,
            max: 5,
            step: 1,
            label: "ETC1S Compression Level (0 = fastest)",
        });

        cpLevelPane.on("change", (ev) => {
            this.props.globalState.compressionLevel = ev.value;
            localStorage.setItem("compressionLevel", ev.value.toString());
        });

        /*
        const compressionLevelPane = fKTX.addBinding({ compressionLevel: this.props.globalState.compressionLevel }, "compressionLevel", {
            min: 0,
            max: 5,
            step: 1,
            label: "ETC1S Compression Level (0 = fastest)",
            
        });

        compressionLevelPane.on("change", (ev) => {
            this.props.globalState.compressionLevel = ev.value;

            console.log(this.props.globalState.compressionLevel )
            localStorage.setItem("compressionLevel", ev.value.toString());
            console.log(localStorage)
        });
        //
        */
        //
        const needSupercompressionPane = fKTX.addBinding({ needSupercompression: this.props.globalState.needSupercompression }, "needSupercompression", {
            label: "Use UASTC Zstandard Supercompression",
        });

        needSupercompressionPane.on("change", (ev) => {
            this.props.globalState.needSupercompression = ev.value;
            localStorage.setItem("needSupercompression", ev.value.toString());
        });
        //
        const f2 = pane.addFolder({
            title: "Other",
        });
        const resetButton = f2.addButton({
            title: "RESET",
            label: "RESET ALL SETTINGS", // optional
        });

        resetButton.on("click", () => {
            localStorage.clear();
            location.reload();
        });

        //

        const transformsArray = [];

        if (this.props.globalState.dedupState) {
            transformsArray.push(dedup());
        }

        if (this.props.globalState.pruneState) {
            transformsArray.push(prune());
        }

        if (this.props.globalState.flattenState) {
            transformsArray.push(flatten());
        }
        if (this.props.globalState.joinState) {
            transformsArray.push(join({ keepMeshes: false, keepNamed: false }));
        }

        if (this.props.globalState.resampleState) {
            transformsArray.push(resample());
        }

        if (this.props.globalState.weldState) {
            transformsArray.push(weld({ exhaustive: false, tolerance: this.props.globalState.weldTolerance, toleranceNormal: this.props.globalState.weldToleranceNormal }));
        }

        if (this.props.globalState.simplifyState) {
            transformsArray.push(simplify({ simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.001 }));
        }

        if (this.props.globalState.reorderState) {
            transformsArray.push(reorder({ encoder: MeshoptEncoder }));
        }
        if (this.props.globalState.quantizeState) {
            transformsArray.push(quantize());
        }

        //
        //

        let myFunc;
        let myOptions;

        let texMode;

        if (this.props.globalState.textureValue == "ktx2/UASTC") {
            texMode = true;
        }
        if (this.props.globalState.textureValue == "ktx2/ETC1S") {
            texMode = false;
        }

        if (this.props.globalState.textureValue == "ktx2/UASTC" || this.props.globalState.textureValue == "ktx2/ETC1S" || this.props.globalState.textureValue == "ktx2/MIX") {
            //   console.log("KTX2");

            //   console.log(this.props.globalState);
            document.getElementById("ktx-container")!.style.display = "initial";
            document.getElementById("ktx")!.innerHTML = "Starting KTX2 Conversion...";
            //
            if (this.props.globalState.textureValue == "ktx2/UASTC") {
                document.getElementById("ktx")!.innerHTML +=
                    "<br/>UASTC is designed for efficient interchange of very high quality GPU texture data while being quickly transcodable to numerous other hardware GPU texture formats. ";
            }

            if (this.props.globalState.textureValue == "ktx2/ETC1S") {
                document.getElementById("ktx")!.innerHTML +=
                    "<br/>ETC1S is the original low/medium quality mode, producing lower file size but with lower quality in comparison with UASTC. To use ETC1S only on albedo textures choose <strong>ktx2/MIX</strong> Texture Format.";
            }

            if (this.props.globalState.textureValue == "ktx2/MIX") {
                document.getElementById("ktx")!.innerHTML +=
                    "<br/> In the MIX mode albedo (baseColor) textures are processed with ETC1S.<br/> Textures from all other channels are compressed with UASTC.";
            }

            if (this.props.globalState.resizeValue !== "No Resize") {
                myOptions = { resize: [Number(this.props.globalState.resizeValue), Number(this.props.globalState.resizeValue)] };
                myFunc = textureCompress(myOptions as any);
                await doc.transform(myFunc);
            }
            //   console.log(this.props.globalState.resizeValue);
            //
            // START KTX

            console.log("Starting KTX2 Conversion");
            //    console.log("compressionLevel ", this.props.globalState.compressionLevel)

            let totalTime = 0;
            let timer = 0;
            //   let texIndex = 0;

            for (const tex of doc.getRoot().listTextures()) {
                timer = Date.now();
                let img = tex.getImage();

                let mt = tex.getMimeType();
                let texType;

                if (mt.includes("jpeg")) {
                    texType = 0;
                }
                if (mt.includes("png")) {
                    texType = 1;
                }
                //
                //
                if (this.props.globalState.textureValue == "ktx2/MIX") {
                    const slots = listTextureSlots(tex);
                    console.log(slots);

                    for (const slot of slots) {
                        if (slot.includes("baseColor")) {
                            texMode = false;
                        } else {
                            texMode = true;
                        }
                    }
                }
                //
                //

                if (img) {
                    let imgKTX = await ktx.encodeToKTX2(img.buffer, {
                        type: texType,
                        enableDebug: false,
                        generateMipmap: true,
                        isUASTC: texMode,
                        qualityLevel: this.props.globalState.qualityLevel, // 1-255
                        compressionLevel: this.props.globalState.compressionLevel, // 0-5
                        //  isSetKTX2SRGBTransferFunc: false,
                        //  needSupercompression:false,
                    });

                    tex.setMimeType("image/ktx2").setImage(imgKTX);
                }

                // KTX2 Texture done
                console.log(tex.getName());
                console.log(tex.getSize()![0] + " * " + tex.getSize()![1]);

                //    document.getElementById("ktx")!.innerHTML = "Texture " + texIndex + tex.getName();
                //   document.getElementById("ktx")!.innerHTML += tex.getSize()![0] + " * " + tex.getSize()![1];

                console.log(((Date.now() - timer) * 0.001).toFixed(2) + " seconds");
                totalTime += Number(((Date.now() - timer) * 0.001).toFixed(2));
            }

            doc.createExtension(KHRTextureBasisu).setRequired(true);

            console.log("Total Conversion Time " + totalTime.toFixed(2) + " seconds");

            document.getElementById("ktx")!.innerHTML = "Total Conversion Time " + totalTime.toFixed(2) + " seconds";

            //      document.getElementById("ktx")!.innerHTML += "<br/>Finished KTX2 Conversion, fixing..."

            console.log("Finished KTX2 Conversion, fixing...");

            timer = Date.now();
            await doc.transform(ktxfix());

            console.log("The correction took " + ((Date.now() - timer) * 0.001).toFixed(2) + " seconds");
            //  console.log(inspect(doc));
            //    document.getElementById("ktx")!.innerHTML += " " + ((Date.now() - timer) * 0.001).toFixed(2) + " seconds."
            document.getElementById("ktx")!.innerHTML += "<br/> Done!";

            //
            this._scene.onPointerObservable.addOnce(function () {
                setTimeout(() => {
                    document.getElementById("ktx-container")!.style.display = "none";
                }, 3000);
            });
            //
        }
        //
        if (this.props.globalState.textureValue !== "Keep Original" && this.props.globalState.textureValue !== "ktx2") {
            myOptions = { targetFormat: this.props.globalState.textureValue };
            myFunc = textureCompress(myOptions as any);
            //    console.log(myFunc);

            if (this.props.globalState.resizeValue !== "No Resize") {
                myOptions = { targetFormat: this.props.globalState.textureValue, resize: [Number(this.props.globalState.resizeValue), Number(this.props.globalState.resizeValue)] };
                myFunc = textureCompress(myOptions as any);
            }
        } else {
            if (this.props.globalState.resizeValue !== "No Resize") {
                myOptions = { resize: [Number(this.props.globalState.resizeValue), Number(this.props.globalState.resizeValue)] };
                myFunc = textureCompress(myOptions as any);
            }
        }
        if (myFunc) {
            transformsArray.push(myFunc);
        }

        //  transformsArray.push(textureCompress({   targetFormat: "webp"}))
        //      console.log(transformsArray);
        //
        //

        //     console.log("UNDEFINED | NO RESIZE");
        //     console.log("dedup ", this.props.globalState.dedupState);
        await doc.transform(
            //   dedup(),

            ...transformsArray,

            //   backfaceCulling({ cull: false })

            //                quantize()

            //   weld({ tolerance: 0.001, toleranceNormal: 0.5 }),
            //
            //     prune(),
            //    resample(),
            //    join({ keepMeshes: false, keepNamed: false }),
            //    backfaceCulling({ cull: false }),
            //    weld({ tolerance: 0.001, toleranceNormal: 0.5 }),

            //     reorder({ encoder: MeshoptEncoder }),
            //      meshopt({encoder: MeshoptEncoder, level: 'medium'})

            //   simplify({ simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.001 }),
             //  instance({ min: 2 }),
            //  textureCompress({
            //   targetFormat: "webp",
            //, resize: [1024, 1024]
            //   })
        );

        totalVRAM = 0;
        doc.getRoot()
            .listTextures()
            .forEach((tex) => {
                const vram = ImageUtils.getVRAMByteLength(tex.getImage()!, tex.getMimeType());

                //    console.log("OPTIMIZED VRAM: " + vram)
                totalVRAM += vram!;
            });

        //    console.log("TOTAL OPTIMIZED VRAM " + niceBytes(totalVRAM))

        //@ts-ignore
        function backfaceCulling(options: any) {
            return (doc: any) => {
                for (const material of doc.getRoot().listMaterials()) {
                    //   console.log(material);
                    //    console.log(options.cull);
                    material.setDoubleSided(!options.cull);
                }
            };
        }
        const glb = await io.writeBinary(doc);

        const assetBlob = new Blob([glb]);
        const assetUrl = URL.createObjectURL(assetBlob);

        const newGLB = await SceneLoader.ImportMeshAsync("", assetUrl, undefined, this._scene, undefined, ".glb");

        //  console.log(newGLB);

        this.props.globalState.optURL = assetUrl;

        document.getElementById("topRight")!.innerHTML =
            "Optimized: <strong>" +
            (glb.length / (1024 * 1024)).toFixed(2).toString() +
            " Mb</strong> | Resize: <strong>" +
            this.props.globalState.resizeValue +
            "</strong> | Texture: <strong>" +
            this.props.globalState.textureValue +
            "</strong>";
        document.getElementById("topRight")!.innerHTML += " | OPTIMIZED VRAM " + niceBytes(totalVRAM);

        //  console.log(this.props.globalState.optURL)

        const rr = newGLB.meshes[0];
        //   this._scene.debugLayer.select(rr);

        rr.getChildMeshes().forEach((element) => {
            element.layerMask = 0x20000000;
        });
        //

        //
        //
    }

    loadTextureAsset(url: string): Scene {
        const scene = new Scene(this._engine);
        const plane = CreatePlane("plane", { size: 1 }, scene);

        const texture = new Texture(
            url,
            scene,
            undefined,
            undefined,
            Texture.NEAREST_LINEAR,
            () => {
                const size = texture.getBaseSize();
                if (size.width > size.height) {
                    plane.scaling.y = size.height / size.width;
                } else {
                    plane.scaling.x = size.width / size.height;
                }

                texture.gammaSpace = true;
                texture.hasAlpha = true;
                texture.wrapU = Texture.CLAMP_ADDRESSMODE;
                texture.wrapV = Texture.CLAMP_ADDRESSMODE;

                scene.debugLayer.show();
                scene.debugLayer.select(texture, "PREVIEW");
            },
            (message, exception) => {
                this.props.globalState.onError.notifyObservers({ scene: scene, message: message || exception.message || "Failed to load texture" });
            }
        );

        const material = new PBRMaterial("unlit", scene);
        material.unlit = true;
        material.albedoTexture = texture;
        material.alphaMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
        plane.material = material;

        return scene;
    }

    loadAssetFromUrl() {
        const assetUrl = this.props.assetUrl!;
        const rootUrl = Tools.GetFolderPath(assetUrl);
        const fileName = Tools.GetFilename(assetUrl);

        this._engine.clearInternalTexturesCache();

        const promise = isTextureAsset(assetUrl) ? Promise.resolve(this.loadTextureAsset(assetUrl)) : SceneLoader.LoadAsync(rootUrl, fileName, this._engine);

        promise
            .then((scene) => {
                if (this._scene) {
                    this._scene.dispose();
                }

                this._scene = scene;

                this.onSceneLoaded(fileName);

                scene.whenReadyAsync().then(() => {
                    this._engine.runRenderLoop(() => {
                        scene.render();
                    });
                });
            })
            .catch((reason) => {
                this.props.globalState.onError.notifyObservers({ message: reason.message });
            });
    }

    loadAsset() {
        if (this.props.assetUrl) {
            this.loadAssetFromUrl();
            return;
        }
    }

    componentDidMount() {
        if (!Engine.isSupported()) {
            return;
        }

        Engine.ShadersRepository = "/src/Shaders/";

        // This is really important to tell Babylon.js to use decomposeLerp and matrix interpolation
        Animation.AllowMatricesInterpolation = true;

        // Setting up some GLTF values
        GLTFFileLoader.IncrementalLoading = false;
        this.props.globalState.glTFLoaderExtensions = {};

        let GLTFChecker = false;

        SceneLoader.OnPluginActivatedObservable.add((plugin) => {
            this._currentPluginName = plugin.name;

      //    console.log(plugin);

      this.reImport = false
      if(this.props.globalState.origFilename.includes(".gltf")){
        //      console.log("INCLUDES GLTF")
              this.reImport = true
          }



            // || this._currentPluginName === "babylon.js"
            if (this._currentPluginName === "obj") {
                this.reImport = true;
            }

            if (this._currentPluginName === "gltf") {
                const loader = plugin as GLTFFileLoader;
                loader.transparencyAsCoverage = this.props.globalState.commerceMode;
                loader.validate = true;
                if(this.props.globalState.origFilename.includes(".gltf")) {
                    loader.validate = false;
                }
                

                loader.onExtensionLoadedObservable.add((extension: import("loaders/glTF/index").IGLTFLoaderExtension) => {
                    this.props.globalState.glTFLoaderExtensions[extension.name] = extension;
                });

                loader.onValidatedObservable.add((results) => {
                  //  console.log(results);
                //    console.log(results.uri);

                    if(results.uri.includes(".gltf")){
                        console.log("DSFMKSDFLKSJDFDSFDSFSLKSJDFs")
                        console.log (GLTFChecker)
                    }


                    if (results.issues.numErrors > 0 && !this.props.globalState.textureValue.includes("ktx2")) {
                        this.props.globalState.showDebugLayer();
                        this.errorNum = results.issues.numErrors;
                        //    console.log(results.issues);
                        //    console.log(results.info);
                            console.log(results);
                        //    console.log("errorNum ", this.errorNum);
                        document.getElementById("topInfo")!.style.display = "block";

                        document.getElementById("topInfo")!.innerHTML = "Found <strong>" + this.errorNum + "</strong> validation errors." + "<br/>" + "Hope to correct...";
                        document.getElementById("topInfo")!.innerHTML += "<br/><small>" + "Click Inspector button to toggle Inspector.</small>";
                        setTimeout(() => {
                            document.getElementById("topInfo")!.style.display = "none";
                        }, 4000);
                    }
                });

                loader.onParsedObservable.add((gltfBabylon) => {

              //      console.log(loader)
               // this.reImport = true;
               //       console.log(gltfBabylon.json as any);
                    //    console.log((gltfBabylon.json as any).extensionsRequired);
                    if ((gltfBabylon.json as any).extensionsRequired) {
                        (gltfBabylon.json as any).extensionsRequired.forEach((element: any) => {
                            //     console.log(element);
                            if (element.includes("webp")) {
                                //         console.log("WEBP");
                            }
                            if (element.includes("draco")) {
                                //       console.log("DRACO");
                                this.reImport = true;

                                document.getElementById("topInfo2")!.style.display = "block";
                                document.getElementById("topInfo2")!.innerHTML = "DRACO Compression detected. Uncompressing...<br/> ";
                                setTimeout(() => {
                                    document.getElementById("topInfo2")!.style.display = "none";
                                    document.getElementById("topInfo2")!.innerHTML = "";
                                }, 3000);
                            }
                        });
                    }
                });
                //

                //
            }
        });

        this.initEngine();
    }

    shouldComponentUpdate(nextProps: IRenderingZoneProps) {
        if (nextProps.expanded !== this.props.expanded) {
            setTimeout(() => this._engine.resize());
            return true;
        }
        return false;
    }

    public render() {
        return (
            <div id="canvasZone" className={this.props.expanded ? "expanded" : ""}>
                <canvas id="renderCanvas" touch-action="none" onContextMenu={(evt) => evt.preventDefault()}></canvas>
            </div>
        );
    }
}


export function niceBytes(z: number) {
    const units = ["bytes", "Kb", "Mb", "Gb", "Tb"];
    let x = z.toString();
    let l = 0,
        n = parseInt(x, 10) || 0;

    while (n >= 1024 && ++l) {
        n = n / 1024;
    }

    return n.toFixed(2) + " " + units[l];
}
