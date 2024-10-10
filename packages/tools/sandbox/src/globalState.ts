import { Observable } from "core/Misc/observable";
import type { Scene } from "core/scene";
import type { FilesInput } from "core/Misc/filesInput";
import "@dev/inspector";

export class GlobalState {
    public currentScene: Scene;
    public onSceneLoaded = new Observable<{ scene: Scene; filename: string }>();
    public onError = new Observable<{ scene?: Scene; message?: string }>();
    public onEnvironmentChanged = new Observable<string>();
    public onRequestClickInterceptor = new Observable<void>();
    public onClickInterceptorClicked = new Observable<void>();
    public glTFLoaderExtensions: { [key: string]: import("loaders/glTF/index").IGLTFLoaderExtension } = {};

    public filesInput: FilesInput;
    public isDebugLayerEnabled = false;

    public commerceMode = false;

    public reflector?: {
        hostname: string;
        port: number;
    };

    public skybox = true;

    public wireframe = false;

    public optURL: string;
    public origFilename: string;

    public resizeValue: string;
    public textureValue: string;

    public dedupState: boolean = true;
    public GPUInstanceState: boolean = false;

    public pruneState: boolean = true;

    public joinState: boolean = true;

    public resampleState: boolean = true;

    public flattenState: boolean = true;

    public weldState: boolean = true;
    public weldTolerance: number = 0.001;
    public weldToleranceNormal: number = 0.25;

    public sparseState: boolean = true;
    public sparseRatio: number = 0.333333;

    public simplifyState: boolean = false;
    public simplifyRatio: number = 0;
    public simplifyError: number = 0.0001;
    public simplifyLockborder: boolean = false;

    public quantizeState: boolean = false;

    public reorderState: boolean = false;

    public meshoptState: boolean = false;

    public meshoptLevel = "high";

    public qualityLevel: number = 155;

    public compressionLevel: number = 2;

    public needSupercompression: boolean = false;

    public baseColor: boolean = false;
    public normal: boolean = false;
    public metallic: boolean = false;
    public emissive: boolean = false;
    public occlusion: boolean = false;

    public showDebugLayer() {
        this.isDebugLayerEnabled = true;
        if (this.currentScene) {
            this.currentScene.debugLayer.show();
        }
    }

    public hideDebugLayer() {
        this.isDebugLayerEnabled = false;
        if (this.currentScene) {
            this.currentScene.debugLayer.hide();
        }
    }
}
