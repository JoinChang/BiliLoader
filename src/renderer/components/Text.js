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
        this._component = "p";
        this._props = {
            class: ["b_text", "text2", `fs_${fontSize}`],
        }
        this._slots = {
            default: () => text,
        };
    }
}
