import * as React from "react";
import type { GlobalState } from "../globalState";

interface IWireFrameButtonProps {
    globalState: GlobalState;
    enabled: boolean;
    onClick: () => void;
    icon: any;
    label: string;
}

export class WireFrameButton extends React.Component<IWireFrameButtonProps> {

    public render() {
        if (!this.props.enabled) {
            return null;
        }

        return (
           
         //   <div style={{ backgroundColor: this.props.globalState.wireframe ? 'red' : 'DarkSlateBlue',}}
            <div
            className={this.props.globalState.wireframe ? 'background-red button' : 'background-blue button'} onClick={() => this.props.onClick()}>
                <img src={this.props.icon} alt={this.props.label} title={this.props.label} />
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
