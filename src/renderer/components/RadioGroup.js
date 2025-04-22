import { BaseComponent, Margin } from "./BaseComponent.js";
import { Radio, RadioColor, RadioSize } from "./Radio.js";

export class RadioGroup extends BaseComponent {
    constructor({
        label = "",
        defaultValue = "",
        size = RadioSize.LG,
        color = RadioColor.PINK,
        disabled = false,
        options = [], // [{ label: "", value: "" }]
        onChange = () => {},
        margin = {
            marginTop: Margin.MD,
            marginRight: Margin.NONE,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    }) {
        super({ margin });
        this._component = app.__vue_app__.component("VRadioGroup");
        this._wrapper = document.createElement("div");
        this._label = label;
        this._props = {
            size,
            disabled,
            theme: color,
            modelValue: defaultValue,
            "onUpdate:modelValue": (val) => {
                this._props.modelValue = val;
                onChange(val);
                this.render();
            },
        };
        this._slots = {
            default: () => [
                ...options.map((option) => {
                    return new Radio({
                        label: option.label,
                        value: option.value,
                        size,
                        color,
                        disabled: disabled || option.disabled,
                    }).renderVNode();
                }
            )],
        };
    }

    _initVNode() {
        const { createVNode, Fragment, h } = Vue;

        return createVNode(Fragment, null, [
            this._label && h("p", { class: "b_text text2" }, this._label),
            createVNode(this._component, {
                ...this._props,
                class: [this._props?.class, this._label && "mt_sm"].filter(Boolean).join(" ")
            }, this._slots)
        ]);
    }
}
