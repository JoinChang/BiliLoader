import { BaseComponent, Margin } from "./BaseComponent.js";

export const RadioColor = Object.freeze({
    BLUE: "blue",
    PINK: "pink",
});

export const RadioSize = Object.freeze({
    SM: "small",
    MD: "middle",
    LG: "large",
});

export class Radio extends BaseComponent {
    constructor({
        label = "",
        value = "",
        modelValue = "",
        size = RadioSize.LG,
        color = RadioColor.PINK,
        disabled = false,
        onChange = () => {},
        margin = {
            marginTop: Margin.NONE,
            marginRight: Margin.NONE,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    }) {
        super({ margin });
        this._component = app.__vue_app__.component("VRadio");
        this._props = {
            disabled,
            value,
            modelValue,
            "onUpdate:modelValue": (val) => {
                this._props.modelValue = val;
                onChange(val);
                this.render();
            },
        };
        if (size !== RadioSize.MD) {
            this._props.size = size;
        }
        if (color !== RadioColor.BLUE) {
            this._props.theme = color;
        }
        this._slots = {
            default: () => label,
        }
    }
}
