import * as React from "react";
import type { GlobalState } from "../globalState";
import { FooterButton } from "./footerButton";
import { DropUpButton } from "./dropUpButton";
import { EnvironmentTools } from "../tools/environmentTools";
import { FooterFileButton } from "./footerFileButton";
import { AnimationBar } from "./animationBar";
import type { Nullable } from "core/types";
import type { KHR_materials_variants } from "loaders/glTF/2.0/Extensions/KHR_materials_variants";
import type { Mesh } from "core/Meshes/mesh";
import { WireFrameButton } from "./wfButton";

import "../scss/footer.scss";
// import babylonIdentity from "../img/logo-babylonpress-GB-s.png";
import iconEdit from "../img/icon-edit.svg";
import iconOpen from "../img/icon-open.svg";
import iconIBL from "../img/icon-ibl.svg";
import iconCameras from "../img/icon-cameras.svg";
import iconVariants from "../img/icon-variants.svg";
import iconDownload from "../img/icon-download.svg";
import iconSkybox from "../img/icon-skybox.svg";
import iconFullScreen from "../../Assets/icon_Fullscreen.svg";
import iconTex from "../../Assets/Icon_EditModel.svg";
import iconDash from "../../Assets/Icon_Dashboard.svg";
import iconWireframe from "../../Assets/Icon_Wireframe.svg"

import { compareImages } from "../tools/compareImages";
import { Tools } from "core/Misc/tools";
import { Layer } from "core/Layers/layer";

interface IFooterProps {
    globalState: GlobalState;
}

export class Footer extends React.Component<IFooterProps> {
    private _cameraNames: string[] = [];
    public resizeOptions: string[] = ["No Resize", "2048", "1024", "512", "256"];
    public textureOptions: string[] = ["Keep Original", "webp", "png", "ktx2/UASTC", "ktx2/ETC1S", "ktx2/MIX"];



    public constructor(props: IFooterProps) {
        super(props);
        props.globalState.onSceneLoaded.add(() => {
            this._updateCameraNames();
            this.forceUpdate();
        });
    }

    showInspector() {
        if (this.props.globalState.currentScene) {
            if (this.props.globalState.currentScene.debugLayer.isVisible()) {
                this.props.globalState.hideDebugLayer();
            } else {
                this.props.globalState.showDebugLayer();
            }
        }
    }

    showURL() {
        if (this.props.globalState.optURL) {
            //   console.log("showURL");
            //  console.log(this.props.globalState.optURL);

            const link = document.createElement("a");
            link.href = this.props.globalState.optURL;
            link.download = this.props.globalState.origFilename.replace(/\.[^/.]+$/, "") + "-opt"+".glb";
            link.click();
        }
    }
    //
    //

    makeScreenshot() {
        this.props.globalState.currentScene.executeWhenReady(() => {
            const camScreen = this.props.globalState.currentScene.getCameraByName("default camera")!.clone("camScreen");

            const camScreen2 = this.props.globalState.currentScene.getCameraByName("camera2")!.clone("camScreen");

            if (this.props.globalState.skybox) {
                this.props.globalState.skybox = false;
            }

            setTimeout(() => {
                // to be sure all this will happen not this frame
                Tools.CreateScreenshotUsingRenderTargetAsync(this.props.globalState.currentScene.getEngine(), camScreen, {
                    width: this.props.globalState.currentScene.getEngine().getRenderingCanvas()!.width / 2,
                    height: this.props.globalState.currentScene.getEngine().getRenderingCanvas()!.height,
                }).then((base64Data) => {
                    //   const linkSource = base64Data;
                    //  const downloadLink = document.createElement("a");
                    //  downloadLink.href = linkSource;
                    //  downloadLink.download = "test.png";
                    //   downloadLink.click();

                    // SHOW DIFF IMAGE URL
                    //     console.log(base64Data);
                    //
                    Tools.CreateScreenshotUsingRenderTargetAsync(this.props.globalState.currentScene.getEngine(), camScreen2, {
                        width: this.props.globalState.currentScene.getEngine().getRenderingCanvas()!.width / 2,
                        height: this.props.globalState.currentScene.getEngine().getRenderingCanvas()!.height,
                    }).then((base64Data2) => {
                        //  const linkSource = base64Data2;
                        //  const downloadLink = document.createElement("a");
                        //  downloadLink.href = linkSource;
                        //  downloadLink.download = "cam2.png";
                        //    downloadLink.click();
                        //

                        compareImages(base64Data, base64Data2 ).then((res) => {
                            //   console.log(res);

                            document.getElementById("topInfo")!.style.display = "block";
                            document.getElementById("topInfo")!.innerHTML = res.pm + " pixels mismatch, error " + res.error + "%";
                            setTimeout(() => {
                                document.getElementById("topInfo")!.style.display = "none";
                            }, 3000);

                            const downloadLink = document.createElement("a");
                            downloadLink.href = res.dataURL;

                            downloadLink.download = "dataURL.png";
                            //    downloadLink.click();

                            const screenLayer = new Layer("screenLayer", res.dataURL, this.props.globalState.currentScene, false);
                            screenLayer.layerMask = 0x20000000;
                            //   console.log(screenLayer);

                            this.props.globalState.currentScene.onPointerObservable.addOnce(function () {
                                setTimeout(() => {
                                    screenLayer.dispose();
                                }, 3000);
                            });
                        });

                        //
                    });
                });

                camScreen.dispose();
                camScreen2.dispose();
            }, 50);
        });
    }
    //
    //

    defineResize(option: string) {
        //   console.log(option);
        this.props.globalState.resizeValue = option;

        //   console.log(this.resizeOptions.indexOf(option))
        localStorage.setItem("resizeValue", option);
    }
    //

    openSettings() {
        //    console.log("settingsContainer opened");

        const settingsContainer = document.getElementById("settings-container")!;
        settingsContainer.style.display = settingsContainer.style.display === "initial" ? "" : "initial";
    }
    //
    openHelp() {
        //    console.log("helpContainer opened");

        const helpContainer = document.getElementById("help-container");
        helpContainer!.style.display = helpContainer!.style.display === "initial" ? "" : "initial";
    }

    //
wireframeMode(){
     this.props.globalState.currentScene.forceWireframe = !this.props.globalState.currentScene.forceWireframe
     this.props.globalState.wireframe = this.props.globalState.currentScene.forceWireframe;
     localStorage.setItem("wireframe", this.props.globalState.wireframe.toString());
     console.log("wf_Mode", this.props.globalState.wireframe.toString())
    if(this.props.globalState.currentScene.forceWireframe ){
        this.props.globalState.skybox = false;
    }
    else {
        this.props.globalState.skybox = true
    }
}

//
    defineTextureFormat(option: string) {
        //    console.log(option);
        this.props.globalState.textureValue = option;

        //   console.log(this.resizeOptions.indexOf(option))
        localStorage.setItem("textureValue", option);
    }
    //
    toggleSkybox() {
        if (!this.props.globalState.skybox) {
            this.props.globalState.skybox = true;
        } else {
            this.props.globalState.skybox = false;
        }
    }
    //
    switchCamera(index: number) {
        const camera = this.props.globalState.currentScene!.cameras[index];

        if (camera) {
            if (this.props.globalState.currentScene!.activeCamera) {
                this.props.globalState.currentScene!.activeCamera.detachControl();
            }
            this.props.globalState.currentScene!.activeCamera = camera;
            camera.attachControl();
        }
    }

    private _updateCameraNames(): void {
        if (!!this.props.globalState.currentScene && this.props.globalState.currentScene.cameras.length > 0) {
            this._cameraNames = this.props.globalState.currentScene.cameras.map((c) => c.name);
            this._cameraNames.push("default camera");
        }
    }

    private _getVariantsExtension(): Nullable<KHR_materials_variants> {
        return this.props.globalState?.glTFLoaderExtensions["KHR_materials_variants"] as KHR_materials_variants;
    }

    render() {
        let variantNames: string[] = [];
        let hasVariants = false;
        let activeEntry = () => "";
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let switchVariant = (name: string, index: number) => {};
        const variantExtension = this._getVariantsExtension();
        if (variantExtension && this.props.globalState.currentScene) {
            const scene = this.props.globalState.currentScene;
            const rootNode = scene.getMeshByName("__root__") as Mesh;

            if (rootNode) {
                const variants: string[] = variantExtension.getAvailableVariants(rootNode);

                if (variants && variants.length > 0) {
                    hasVariants = true;

                    variants.splice(0, 0, "Original");
                    variantNames = variants;

                    activeEntry = () => {
                        const lastPickedVariant = variantExtension!.getLastSelectedVariant(rootNode) || 0;
                        if (lastPickedVariant && Object.prototype.toString.call(lastPickedVariant) === "[object String]") {
                            return lastPickedVariant as string;
                        }

                        return variantNames[0];
                    };

                    switchVariant = (name, index) => {
                        if (index === 0) {
                            variantExtension.reset(rootNode);
                        } else {
                            variantExtension.selectVariant(rootNode, name);
                        }
                    };
                }
            }
        }

        const hasCameras = this._cameraNames.length > 1;

        return (
            <div id="footer" className={"footer" + (hasCameras || hasVariants ? " long" : hasCameras && hasVariants ? " longer" : "")}>
                <div className="footerLeft">
                    <a href="https://babylonpress.org/" target={"_blank"}>
                        <img id="logoImg" src={"https://babylonpress.org/wp-content/uploads/2020/12/logo-babylonpress-GB-s.png"} />
                    </a>
                </div>
                <div className="footerAfterLeft"></div>

                <AnimationBar globalState={this.props.globalState} enabled={!!this.props.globalState.currentScene} />
                <div className={"footerRight"}>
                    <FooterFileButton
                        globalState={this.props.globalState}
                        enabled={true}
                        icon={iconOpen}
                        onFilesPicked={(evt) => {
                            this.props.globalState.currentScene?.getEngine().clearInternalTexturesCache();
                            this.props.globalState.filesInput.loadFiles(evt);
                        }}
                        label="Open your scene from your hard drive (.babylon, .gltf, .glb, .obj)"
                    />
                    <DropUpButton
                        globalState={this.props.globalState}
                        icon={iconIBL}
                        label="Select environment"
                        options={EnvironmentTools.SkyboxesNames}
                        activeEntry={() => EnvironmentTools.GetActiveSkyboxName()}
                        onOptionPicked={(option) => this.props.globalState.onEnvironmentChanged.notifyObservers(option)}
                        enabled={!!this.props.globalState.currentScene}
                        searchPlaceholder="Search environment"
                    />
                    <FooterButton
                        globalState={this.props.globalState}
                        icon={iconEdit}
                        label="Display inspector"
                        onClick={() => this.showInspector()}
                        enabled={!!this.props.globalState.currentScene}
                    />
                    <DropUpButton
                        globalState={this.props.globalState}
                        icon={iconCameras}
                        label="Select camera"
                        options={this._cameraNames}
                        activeEntry={() => this.props.globalState.currentScene?.activeCamera?.name || ""}
                        onOptionPicked={(option, index) => this.switchCamera(index)}
                        enabled={this._cameraNames.length > 1}
                        searchPlaceholder="Search camera"
                    />
                    <DropUpButton
                        globalState={this.props.globalState}
                        icon={iconVariants}
                        label="Select variant"
                        options={variantNames}
                        activeEntry={() => activeEntry()}
                        onOptionPicked={(option, index) => switchVariant(option, index)}
                        enabled={hasVariants}
                        searchPlaceholder="Search variant"
                    />
                    <FooterButton
                        globalState={this.props.globalState}
                        icon={iconSkybox}
                        label="Toggle Skybox"
                        onClick={() => this.toggleSkybox()}
                        enabled={!!this.props.globalState.currentScene}
                    />
                    <FooterButton
                        globalState={this.props.globalState}
                        icon={iconDownload}
                        label="Export GLB with WEBP textures"
                        onClick={() => this.showURL()}
                        enabled={!!this.props.globalState.currentScene}
                    />

                    <DropUpButton
                        globalState={this.props.globalState}
                        icon={iconFullScreen}
                        label="Select Resize"
                        options={this.resizeOptions}
                        activeEntry={() => this.props.globalState.resizeValue}
                        onOptionPicked={(option) => this.defineResize(option)}
                        enabled={true}
                    />
                    <FooterButton
                        globalState={this.props.globalState}
                        icon={iconCameras}
                        label="Comparing Screenshot"
                        onClick={() => this.makeScreenshot()}
                        enabled={!!this.props.globalState.currentScene}
                    />

                    <FooterButton
                        globalState={this.props.globalState}
                        icon={iconVariants}
                        label="Settings"
                        onClick={() => this.openSettings()}
                        enabled={!!this.props.globalState.currentScene}
                    />

                    <DropUpButton
                        globalState={this.props.globalState}
                        icon={iconTex}
                        label="Texture Format"
                        options={this.textureOptions}
                        activeEntry={() => this.props.globalState.textureValue}
                        onOptionPicked={(option) => this.defineTextureFormat(option)}
                        enabled={true}
                    />

                    <FooterButton globalState={this.props.globalState} icon={iconDash} label="Help Information" onClick={() => this.openHelp()} enabled={true} />
                    <WireFrameButton globalState={this.props.globalState} icon={iconWireframe} label="Wireframe Mode" 
                    onClick={() =>  this.wireframeMode() } enabled={!!this.props.globalState.currentScene} bgStyle ={this.checkWF()}/>

                </div>
            </div>
        );
    }
      
        public checkWF() {
            console.log("checkWF")
            
            if (this.props.globalState.wireframe) {
                return "red"
            }
            else {
                return "purple"
            }
        }
}
