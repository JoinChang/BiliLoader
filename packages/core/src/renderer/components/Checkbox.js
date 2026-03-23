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
    onChange = () => { },
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
    this.value = Vue.ref(defaultValue);

    this._component = {
      setup: () => {
        const val = this.value;
        return () => Vue.h(app.__vue_app__.component("VCheckbox"), {
          label,
          disabled,
          indeterminate,
          size: size !== CheckboxSize.MD ? size : undefined,
          theme: color !== CheckboxColor.BLUE ? color : undefined,
          modelValue: val.value,
          "onUpdate:modelValue": (v) => { val.value = v; onChange(v); },
        });
      }
    };
    this._wrapper_component = "p";
    this._props = {};
    if (size !== CheckboxSize.MD) {
      this._props.size = size;
    }
    if (color !== CheckboxColor.BLUE) {
      this._props.theme = color;
    }
  }
}
