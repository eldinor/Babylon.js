import * as React from "react";
import type { GlobalState } from "../globalState";

import { Engine } from "core/Engines/engine";
import { WebGPUEngine } from "core/Engines/webgpuEngine";
import { SceneLoader } from "core/Loading/sceneLoader";
import { GLTFFileLoader } from "loaders/glTF/glTFFileLoader";
import { Scene } from "core/scene";
import type { Vector3 } from "core/Maths/math.vector";
import { ArcRotateCamera } from "core/Cameras/arcRotateCamera";
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
import { WebIO, Logger } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

import { inspect, textureCompress } from "@gltf-transform/functions";
import { Viewport } from "core/Maths/math.viewport";
import { compareImages } from "../tools/compareImages";

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
}

export class RenderingZone extends React.Component<IRenderingZoneProps> {
    private _currentPluginName?: string;
    private _engine: Engine;
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _originBlob: Blob;
    // private _originFilename: string;

    public constructor(props: IRenderingZoneProps) {
        super(props);
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

            //   console.log("filesToLoad[0]", filesToLoad[0] )

            this.props.globalState.origFilename = (filesToLoad[0] as any).correctName;
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

        console.log();

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

        const arr = new Uint8Array(await this._originBlob.arrayBuffer());
        document.getElementById("topLeft")!.innerHTML = this.props.globalState.origFilename;
        document.getElementById("topLeft")!.innerHTML += " | ";
        document.getElementById("topLeft")!.innerHTML += "<strong>" + (arr.length / (1024 * 1024)).toFixed(2).toString() + " Mb</strong>";

        const io = new WebIO().registerExtensions(ALL_EXTENSIONS);

        const doc = await io.readBinary(arr);

        doc.setLogger(new Logger(Logger.Verbosity.DEBUG));

        console.log(inspect(doc));

        await doc.transform(
            //    dedup(),
            //   join({ keepMeshes: false, keepNamed: false }),
            //   weld({ tolerance: 0.0001 }),
            //  simplify({ simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.001 }),
            //    prune(),
            //   reorder({ encoder: MeshoptEncoder }),
            textureCompress({
                targetFormat: "webp",
                //, resize: [1024, 1024]
            })
        );

        const glb = await io.writeBinary(doc);

        const assetBlob = new Blob([glb]);
        const assetUrl = URL.createObjectURL(assetBlob);

        const newGLB = await SceneLoader.ImportMeshAsync("", assetUrl, undefined, this._scene, undefined, ".glb");

        //  console.log(newGLB);

        this.props.globalState.optURL = assetUrl;

        document.getElementById("topRight")!.innerHTML = "With WEBP Textures: <strong>" + (glb.length / (1024 * 1024)).toFixed(2).toString() + " Mb</strong>";

        //  console.log(this.props.globalState.optURL)

        const rr = newGLB.meshes[0];
        //   this._scene.debugLayer.select(rr);

        rr.getChildMeshes().forEach((element) => {
            element.layerMask = 0x20000000;
        });
        //

        const compImg = await compareImages(
            "https://raw.githubusercontent.com/eldinor/ForBJS/master/bird1.jpg",
            "https://raw.githubusercontent.com/eldinor/ForBJS/master/bird2.jpg"
        );

        console.log(compImg);

        //

        const camScreen = this._scene.getCameraByName("default camera")!.clone("camScreen");

        const camScreen2 = this._scene.getCameraByName("camera2")!.clone("camScreen");

        // console.log(camScreen)
        /*
        this._scene.activeCameras!.push(camScreen)
        this._scene.activeCamera = camScreen
        
            const scr1 = await CreateScreenshotUsingRenderTargetAsync(this._scene.getEngine(), camScreen, {width:1000, height:600},"image/png");
            console.log(scr1)
        */

        this._scene.executeWhenReady(() => {
            Tools.CreateScreenshotUsingRenderTargetAsync(this._engine, camScreen, { width: this._canvas.width, height: this._canvas.height }).then((base64Data) => {
                const linkSource = base64Data;
                const downloadLink = document.createElement("a");
                downloadLink.href = linkSource;
                downloadLink.download = "test.png";
                //   downloadLink.click();

                console.log(base64Data);

                Tools.CreateScreenshotUsingRenderTargetAsync(this._engine, camScreen2, { width: this._canvas.width, height: this._canvas.height }).then((base64Data2) => {
                    const linkSource = base64Data2;
                    const downloadLink = document.createElement("a");
                    downloadLink.href = linkSource;
                    downloadLink.download = "cam2.png";
                    //    downloadLink.click();
//

 compareImages(base64Data,base64Data2).then((res)=>{
    console.log(res)
    const downloadLink = document.createElement("a");
                    downloadLink.href = res.dataURL;
                    downloadLink.download = "dataURL.png";
                    downloadLink.click();
 })



                    //

                });
            });
        });

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
        SceneLoader.OnPluginActivatedObservable.add((plugin) => {
            this._currentPluginName = plugin.name;
            if (this._currentPluginName === "gltf") {
                const loader = plugin as GLTFFileLoader;
                loader.transparencyAsCoverage = this.props.globalState.commerceMode;
                loader.validate = true;

                loader.onExtensionLoadedObservable.add((extension: import("loaders/glTF/index").IGLTFLoaderExtension) => {
                    this.props.globalState.glTFLoaderExtensions[extension.name] = extension;
                });

                loader.onValidatedObservable.add((results) => {
                    if (results.issues.numErrors > 0) {
                        this.props.globalState.showDebugLayer();
                    }
                });
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
