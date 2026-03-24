import { BaseComponent, Margin } from "./BaseComponent.js";
import { Checkbox, CheckboxColor, CheckboxSize } from "./Checkbox.js";

export class CheckboxGroup extends BaseComponent {
  constructor({
    label = "",
    defaultValue = [], // [value1, value2, ...]
    size = CheckboxSize.LG,
    color = CheckboxColor.PINK,
    disabled = false,
    options = [], // [{ label: "", value: "", disabled: false }]
    onChange = () => { },
    margin = {
      marginTop: Margin.MD,
      marginRight: Margin.NONE,
      marginBottom: Margin.NONE,
      marginLeft: Margin.NONE,
    },
  }) {
    super({ margin });
    this.values = Vue.ref(new Set(defaultValue));

    this._label = label;
    this._wrapper_component = "div";

    const checkboxes = options.map((option) => {
      const cb = new Checkbox({
        label: option.label,
        defaultValue: defaultValue.includes(option.value),
        size,
        color,
        disabled: disabled || option.disabled,
        onChange: (checked) => {
          const next = new Set(this.values.value);
          checked ? next.add(option.value) : next.delete(option.value);
          this.values.value = next;
          onChange([...next]);
        },
        margin: { marginRight: Margin.LG },
      });
      cb._wrapper_component = null;
      return cb;
    });

    this._component = "div";
    this._slots = {
      default: () => checkboxes.map((cb) => cb.renderVNode()),
    };
  }

  _initVNode() {
    const { createVNode, Fragment, h } = Vue;

    return createVNode(Fragment, null, [
      this._label && h("p", { class: "b_text text2" }, this._label),
      createVNode(this._component, {
        ...this._props,
        class: this._label ? "mt_sm" : undefined,
      }, this._slots),
    ]);
  }
}
