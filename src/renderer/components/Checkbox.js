import { BaseComponent, Margin } from "./BaseComponent.js";

export const CheckboxColor = Object.freeze({
    BLUE: "blue",
    PINK: "pink",
});

export const CheckboxSize = Object.freeze({
    SM: "small",
    MD: "middle",
    LG: "large",
});

export class Checkbox extends BaseComponent {
    constructor({
        label = "",
        defaultValue = false,
        size = CheckboxSize.LG,
        color = CheckboxColor.PINK,
        indeterminate = false,
        disabled = false,
        onChange = () => {},
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
        this.value = Vue.ref(defaultValue);

        this._component = app.__vue_app__.component("VCheckbox");
        this._wrapper_component = "p";
        this._props = {
            label,
            disabled,
            indeterminate,
            modelValue: this.value,
            "onUpdate:modelValue": (val) => {
                this.value.value = val;
                onChange(val);
            },
        };
        if (size !== CheckboxSize.MD) {
            this._props.size = size;
        }
        if (color !== CheckboxColor.BLUE) {
            this._props.theme = color;
        }
    }
}
