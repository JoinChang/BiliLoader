import { BaseComponent, Margin } from "./BaseComponent.js";

const ARROW_ICON = '<path fill="none" stroke-linejoin="round" stroke-linecap="round" stroke-width="145.067" stroke="currentColor" d="m341.333 170.667 341.334 341.332-341.334 341.335"></path>';

let selectIdCounter = 0;

export class Select extends BaseComponent {
  constructor({
    label = "",
    defaultValue = "",
    options = [], // [{ label: "", value: "" }]
    onChange = () => { },
    margin = {
      marginTop: Margin.MD,
      marginRight: Margin.NONE,
      marginBottom: Margin.NONE,
      marginLeft: Margin.NONE,
    },
  }) {
    super({ margin });
    this.value = Vue.ref(defaultValue);
    this._options = [...options];

    const VDropdown = app.__vue_app__.component("VDropdown");

    this._component = {
      setup: () => {
        const { h } = Vue;
        const selected = this.value;

        const buttonId = `bl-select-${++selectIdCounter}`;
        this._buttonId = buttonId;

        return () => h("div", null, [
          label && h("p", { class: "b_text text2" }, label),
          h(VDropdown, {
            placement: "bottom-start",
            trigger: "click",
            clickHide: true,
            offset: 10,
          }, {
            default: () => h("button", {
              id: buttonId,
              class: "vui_button dropdown_select--button mt_sm p_relative fs_4 text_ellipsis text_left",
            }, [
              this._getLabel(),
              h("svg", {
                xmlns: "http://www.w3.org/2000/svg",
                viewBox: "0 0 1024 1024",
                class: "dropdown_select--button--icon rotate_90 p_absolute",
                innerHTML: ARROW_ICON,
              }),
            ]),
            content: () => h("div", {
              class: "dropdown_select--content settings-dropdown",
            }, this._options.map((opt, i) =>
              h("div", {
                class: [
                  "dropdown_select--option",
                  "cs_pointer",
                  opt.value === selected.value && "is-active",
                  i > 0 && "mt_xs",
                ],
                onClick: () => {
                  selected.value = opt.value;
                  this._updateButton();
                  onChange(opt.value);
                },
              }, [
                h("div", { class: "dropdown_select--option-title" }, opt.label),
              ])
            )),
          }),
        ]);
      },
    };
  }

  _getLabel() {
    const opt = this._options.find(o => o.value === this.value.value);
    return opt ? opt.label : String(this.value.value);
  }

  _updateButton() {
    const btn = document.getElementById(this._buttonId);
    if (btn) btn.firstChild.textContent = this._getLabel();
  }

  setOptions(options, value) {
    this._options = [...options];
    if (value !== undefined) this.setValue(value);
    else this._updateButton();
  }

  setValue(value) {
    this.value.value = value;
    this._updateButton();
  }
}
