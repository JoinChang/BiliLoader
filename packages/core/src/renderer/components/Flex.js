import { BaseComponent, Margin } from "./BaseComponent.js";

export class FlexRow extends BaseComponent {
    constructor({
        children = [],
        margin = {
            marginTop: Margin.MD,
            marginRight: Margin.NONE,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    }) {
        super({
            margin: margin,
        });
        this._component = "div";
        this._props = {
            class: ["flex_start"],
        };
        this._slots = {
            default: () => children.map(child => {
                if (child instanceof BaseComponent) {
                    return child.renderVNode();
                }
                return child;
            }),
        };
    }
}