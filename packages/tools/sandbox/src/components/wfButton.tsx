import * as React from "react";
import type { GlobalState } from "../globalState";

interface IWireFrameButtonProps {
    globalState: GlobalState;
    enabled: boolean;
    onClick: () => void;
    icon: any;
    label: string;
   bgStyle:string;
}

export class WireFrameButton extends React.Component<IWireFrameButtonProps> {
    public  isBackgroundRed = true;
    public render() {
        if (!this.props.enabled) {
            return null;
        }

        return (
           
            <div style={{ background:  this.props.bgStyle}}
            className={this.isBackgroundRed ? 'background-red button' : 'background-blue button'} onClick={() => this.props.onClick()}>
                <img src={this.props.icon} alt={this.props.label} title={this.props.label} />
            </div>
        );
    }
    //@ts-ignore
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
