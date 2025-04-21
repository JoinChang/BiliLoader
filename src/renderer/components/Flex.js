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

        this.component = document.createElement("div");
        this.component.classList.add("flex_start");

        children.forEach(child => {
            this.component.appendChild(child instanceof HTMLElement ? child : child.render());
        });
    }

    render() {
        this._applyBaseStyles(this.component);
        return this.component;
    }
}