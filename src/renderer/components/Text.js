import { BaseComponent, Margin } from "./BaseComponent.js";

export class Text extends BaseComponent {
    constructor({
        text = "",
        fontSize = 4,
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

        this.component = document.createElement("p");
        this.component.classList.add("b_text", "text2");
        this.component.classList.add(`fs_${fontSize}`);
        this.component.innerText = text;
    }

    render() {
        this._applyBaseStyles(this.component);
        return this.component;
    }
}
