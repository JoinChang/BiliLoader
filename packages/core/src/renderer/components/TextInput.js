import { BaseComponent, Margin } from "./BaseComponent.js";

export const TextInputSize = Object.freeze({
  SM: "small",
  MD: "middle",
  LG: "large",
});

export class TextInput extends BaseComponent {
  constructor({
    label = "",
    placeholder = "",
    defaultValue = "",
    width = 170,
    size = TextInputSize.MD,
    disabled = false,
    onSubmit = () => {},
    onChange = () => {},
    margin = {
      marginTop: Margin.NONE,
      marginRight: Margin.NONE,
      marginBottom: Margin.NONE,
      marginLeft: Margin.NONE,
    },
  }) {
    super({ margin });
    this._label = label;
    this.value = Vue.ref(defaultValue);

    this._component = {
      setup: () => {
        const val = this.value;
        return () => {
          const { h, createVNode, Fragment } = Vue;
          const input = h("div", { class: "bl-text-input", style: `width: ${width}px;` }, [
            h(app.__vue_app__.component("VInput"), {
              size,
              disabled,
              placeholder,
              modelValue: val.value,
              "onUpdate:modelValue": (v) => { val.value = v; onChange(v); },
              onKeydown: (e) => {
                if (e.key === "Enter" && val.value.trim()) {
                  onSubmit(val.value.trim());
                  val.value = "";
                }
              },
            }),
          ]);
          if (!this._label) return input;
          return createVNode(Fragment, null, [
            h("p", { class: "b_text text2" }, this._label),
            h("div", { class: "mt_sm" }, [input]),
          ]);
        };
      }
    };
  }
}
