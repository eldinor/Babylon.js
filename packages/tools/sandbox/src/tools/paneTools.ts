import { Pane } from "tweakpane";
import * as CamerakitPlugin from "@tweakpane/plugin-camerakit";

export function mainPane() {
    const pane = new Pane({
        container: document.getElementById("paneContainer") as any,
    });
    pane.registerPlugin(CamerakitPlugin);
    // console.log(pane);

    // File name
    pane.addBlade({
        view: "text",
        label: "FILE",
        parse: (v: any) => String(v),
        value: "filename",
    });

    // ##############################
    return pane;
    // mainPane end
}
