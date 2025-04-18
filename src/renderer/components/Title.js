import { BaseComponent, Margin } from "./BaseComponent.js";

export class Title extends BaseComponent {
    constructor({
        text = "",
        order = 1,
        margin = {
            marginTop: Margin.NONE,
            marginRight: Margin.NONE,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    }) {
        super({
            margin: margin,
        });

        this.component = document.createElement(`h${order}`);
        this.component.classList.add("b_text");
        this.component.innerText = text;

        this.applyBaseStyles(this.component);
    }
}
