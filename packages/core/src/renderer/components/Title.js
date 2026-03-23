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
        this._component = `h${order}`;
        this._props = {
            class: ["b_text"],
        };
        this._slots = {
            default: () => text,
        };
    }
}
