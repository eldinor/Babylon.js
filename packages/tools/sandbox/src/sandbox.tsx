import * as React from "react";
import * as ReactDOM from "react-dom";
import { GlobalState } from "./globalState";
import { RenderingZone } from "./components/renderingZone";
import { ReflectorZone } from "./components/reflectorZone";
import { Footer } from "./components/footer";
import { EnvironmentTools } from "./tools/environmentTools";
import { Vector3 } from "core/Maths/math.vector";
import { Deferred } from "core/Misc/deferred";
import type { Scene } from "core/scene";
import { CreateScreenshotAsync } from "core/Misc/screenshotTools";
import type { IScreenshotSize } from "core/Misc/interfaces/screenshotSize";
import { Color3, Color4 } from "core/Maths/math";

import "./scss/main.scss";
import fullScreenLogo from "./img/icon-full.svg";

interface ISandboxProps {}

export class Sandbox extends React.Component<ISandboxProps, { isFooterVisible: boolean; errorMessage: string }> {
    private _globalState: GlobalState;
    private _assetUrl?: string;
    private _autoRotate?: boolean;
    private _cameraPosition?: Vector3;
    private _logoRef: React.RefObject<HTMLImageElement>;
    private _dropTextRef: React.RefObject<HTMLDivElement>;
    private _clickInterceptorRef: React.RefObject<HTMLDivElement>;
    private _clearColor?: string;
    private _camera?: number;

    public constructor(props: ISandboxProps) {
        super(props);
        this._globalState = new GlobalState();
        this._logoRef = React.createRef();
        this._dropTextRef = React.createRef();
        this._clickInterceptorRef = React.createRef();

        this.state = { isFooterVisible: true, errorMessage: "" };

        this.checkUrl();

        EnvironmentTools.HookWithEnvironmentChange(this._globalState);

        // Events
        this._globalState.onSceneLoaded.add((info) => {
            document.title = "Babylon.js - " + info.filename;
            this.setState({ errorMessage: "" });

            this._globalState.currentScene = info.scene;
            if (
                this._globalState.currentScene.meshes.length === 0 &&
                this._globalState.currentScene.clearColor.r === 1 &&
                this._globalState.currentScene.clearColor.g === 0 &&
                this._globalState.currentScene.clearColor.b === 0
            ) {
                this._logoRef.current!.className = "";
            } else {
                this._logoRef.current!.className = "hidden";
                this._dropTextRef.current!.className = "hidden";
            }

            if (this._clearColor) {
                info.scene.clearColor = Color4.FromColor3(Color3.FromHexString(`#${this._clearColor}`), 1);
            }

            if (this._camera != undefined) {
                info.scene.activeCamera = info.scene.cameras[this._camera];
            }

            Sandbox._SceneLoadedDeferred.resolve(info.scene);
        });

        this._globalState.onError.add((error) => {
            if (error.scene) {
                this._globalState.showDebugLayer();
            }

            if (error.message) {
                this.setState({ errorMessage: error.message });
            }

            Sandbox._SceneLoadedDeferred.reject(new Error(error.message));
        });

        this._globalState.onRequestClickInterceptor.add(() => {
            const div = this._clickInterceptorRef.current!;

            if (div.classList.contains("hidden")) {
                div.classList.remove("hidden");
            } else {
                div.classList.add("hidden");
            }
        });

        // Keyboard
        window.addEventListener("keydown", (event: KeyboardEvent) => {
            // Press space to toggle footer
            if (event.keyCode === 32 && event.target && (event.target as HTMLElement).nodeName !== "INPUT") {
                this.setState({ isFooterVisible: !this.state.isFooterVisible });
            }
        });
    }

    checkUrl() {
        const set3DCommerceMode = () => {
            document.title = "Babylon.js Sandbox for 3D Commerce";
            this._globalState.commerceMode = true;
        };

        const setReflectorMode = () => {
            document.title = "Babylon.js Reflector";
            this._globalState.reflector = { hostname: "localhost", port: 1234 };
        };

        const host = location.host.toLowerCase();
        if (host.indexOf("3dcommerce") === 0) {
            set3DCommerceMode();
        } else if (host.toLowerCase().indexOf("reflector") === 0) {
            setReflectorMode();
        }

        const indexOf = location.href.indexOf("?");
        if (indexOf !== -1) {
            const params = location.href.substr(indexOf + 1).split("&");
            for (const param of params) {
                const split = param.split("=", 2);
                const name = split[0];
                const value = split[1];
                switch (name) {
                    case "assetUrl": {
                        this._assetUrl = value;
                        break;
                    }
                    case "autoRotate": {
                        this._autoRotate = value === "true" ? true : false;
                        break;
                    }
                    case "cameraPosition": {
                        this._cameraPosition = Vector3.FromArray(
                            value.split(",").map(function (component) {
                                return +component;
                            })
                        );
                        break;
                    }
                    case "kiosk": {
                        this.state = { isFooterVisible: value === "true" ? false : true, errorMessage: "" };
                        break;
                    }
                    case "reflector": {
                        setReflectorMode();
                        break;
                    }
                    case "3dcommerce": {
                        set3DCommerceMode();
                        break;
                    }
                    case "hostname": {
                        if (this._globalState.reflector) {
                            this._globalState.reflector.hostname = value;
                        }
                        break;
                    }
                    case "port": {
                        if (this._globalState.reflector) {
                            this._globalState.reflector.port = +value;
                        }
                        break;
                    }
                    case "environment": {
                        EnvironmentTools.SkyboxPath = value;
                        break;
                    }
                    case "skybox": {
                        this._globalState.skybox = value === "true" ? true : false;
                        break;
                    }
                    case "clearColor": {
                        this._clearColor = value;
                        break;
                    }
                    case "camera": {
                        this._camera = +value;
                        break;
                    }
                }
            }
        }
    }

    componentDidUpdate() {
        this._assetUrl = undefined;
        this._cameraPosition = undefined;
    }

    public render() {
        return (
            <div id="root">
                <div id="topBar">
                    <div className="row">
                        <div className="column" id="topLeft">
                            Original Size
                        </div>
                        <div className="column" id="topRight">
                            Converted Size
                        </div>
                    </div>
                    <div id="topInfo">
                    </div>
                </div>
                <div id="help-container">
                <div id="help">

                    <h2>Instant reload - press 'R' to reload the file with new settings applied.</h2>

                    <h1>Basic Optimization</h1>
                <h2>Dedup</h2>
                <p>Removes duplicate Accessor, Mesh, Texture, and Material properties.</p>
                <small>Default: true</small>

                <h2>Prune</h2>
                <p>Removes properties from the file if they are not referenced by a Scene.</p>
                <small>Default: true</small>

                <h2>Flatten</h2>
                <p>Flattens the scene graph, leaving Nodes with Meshes, Cameras, and other attachments as direct children of the Scene. Skeletons and their descendants are left in their original Node structure.</p>
                <small>Default: true</small>

                <h2>Resample</h2>
                <p>Resample AnimationChannels, losslessly deduplicating keyframes to reduce file size. Duplicate keyframes are commonly present in animation 'baked' by the authoring software to apply IK constraints or other software-specific features.</p>
                <small>Default: true</small>

                <h2>Weld</h2>
                <p>Index Primitives and (optionally) merge similar vertices. When merged and indexed, data is shared more efficiently between vertices. File size can be reduced, and the GPU can sometimes use the vertex cache more efficiently.  
                    The 'tolerance' threshold determines which vertices qualify for welding based on distance between the vertices as a fraction of the primitive's bounding box (AABB). To preserve visual appearance consistently, use low toleranceNormal thresholds around 0.1 (±3º). To pre-processing a scene before simplification or LOD creation, use higher thresholds around 0.5 (±30º).</p>
                <small>Default: true | tolerance = 0.001 | toleranceNormal = 0.25</small>

                <h2>Simplify</h2>
                <p>Simplification algorithm, based on meshoptimizer, producing meshes with fewer triangles and vertices. Simplification is lossy, but the algorithm aims to preserve visual quality as much as possible for given parameters.</p>
                <small>Default: true</small>

                <h1>KHR Extensions</h1>

                <h2>Quantize</h2>
                <p>Quantizes vertex attributes with KHR_mesh_quantization, reducing the size and memory footprint of the file.</p>
                <small>Default: false</small>

                <h2>Reorder</h2>
                <p>Optimizes Mesh Primitives for locality of reference. EXT_meshopt_compression provides compression and fast decoding for geometry, morph targets, and animations. While Meshopt decoding is considerably faster than Draco decoding, neither compression method will improve runtime performance directly. To improve framerate, you'll need to simplify the geometry by reducing vertex count or draw calls — not just compress it. Finally, be aware that Meshopt compression is lossy: repeatedly compressing and decompressing a model in a pipeline will lose precision, so compression should generally be the last stage of an art workflow, and uncompressed original files should be kept.</p>
                <small>Default: false</small>

                <h5><small>Based on <a href="https://gltf-transform.dev/" target="_blank">GLTF-Transform</a> - glTF 2.0 SDK for JavaScript and TypeScript, on Web and Node.js.</small></h5>

                </div>
                </div>
                <div id="settings-container">
                    <div id="settings"></div>
                </div>

                <span>
                    <p id="droptext" ref={this._dropTextRef}>
                        {this._globalState.reflector
                            ? ""
                            : "Drag and drop uncompressed GLTF or GLB files to convert and export them as GLB with WEBP textures (obj and babylon files should be converted to GLB format)"}
                    </p>
                    {this._globalState.reflector ? (
                        <ReflectorZone globalState={this._globalState} expanded={!this.state.isFooterVisible} />
                    ) : (
                        <RenderingZone
                            globalState={this._globalState}
                            assetUrl={this._assetUrl}
                            autoRotate={this._autoRotate}
                            cameraPosition={this._cameraPosition}
                            expanded={!this.state.isFooterVisible}
                        />
                    )}
                </span>
                <div
                    ref={this._clickInterceptorRef}
                    onClick={() => {
                        this._globalState.onClickInterceptorClicked.notifyObservers();
                        this._clickInterceptorRef.current!.classList.add("hidden");
                    }}
                    className="clickInterceptor hidden"
                ></div>
                {this.state.isFooterVisible && <Footer globalState={this._globalState} />}
                <div id="logoContainer">
                    <img id="logo" src={fullScreenLogo} ref={this._logoRef} />
                </div>
                {this.state.errorMessage && (
                    <div id="errorZone">
                        <div className="message">{this.state.errorMessage}</div>
                        <button type="button" className="close" onClick={() => this.setState({ errorMessage: "" })} data-dismiss="alert">
                            &times;
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Use the promise of this deferred to do something after the scene is loaded.
    private static _SceneLoadedDeferred = new Deferred<Scene>();

    public static Show(hostElement: HTMLElement): void {
        const sandbox = React.createElement(Sandbox, {});
        ReactDOM.render(sandbox, hostElement);
    }

    public static CaptureScreenshotAsync(size: IScreenshotSize | number, mimeType?: string): Promise<string> {
        return this._SceneLoadedDeferred.promise.then((scene) => {
            return CreateScreenshotAsync(scene.getEngine(), scene.activeCamera!, size, mimeType);
        });
    }
}
