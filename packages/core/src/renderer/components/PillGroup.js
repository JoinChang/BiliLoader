import { BaseComponent, Margin } from "./BaseComponent.js";
import { Pill } from "./Pill.js";

export class PillGroup extends BaseComponent {
  constructor({
    label = "",
    items = [], // [{ label?, value }] or ["string"]
    onRemove = () => {},
    margin = {
      marginTop: Margin.SM,
      marginRight: Margin.NONE,
      marginBottom: Margin.NONE,
      marginLeft: Margin.NONE,
    },
  }) {
    super({ margin });
    this._label = label;
    this._items = Vue.ref(items.map(i => typeof i === "string" ? { label: i, value: i } : i));
    this._onRemove = onRemove;

    this._component = {
      setup: () => {
        const itemsRef = this._items;
        return () => {
          const { h } = Vue;

          const pills = itemsRef.value.map((item) =>
            new Pill({
              label: item.label,
              value: item.value,
              onRemove: (val) => {
                itemsRef.value = itemsRef.value.filter(i => i.value !== val);
                this._onRemove(val, itemsRef.value);
              },
              margin: { marginRight: Margin.NONE, marginBottom: Margin.NONE },
            }).renderVNode()
          );

          return h("div", null, [
            this._label && h("p", { class: "b_text text2" }, this._label),
            h("div", { class: ["bl-pill-group", this._label && "mt_sm"].filter(Boolean).join(" ") }, pills),
          ]);
        };
      }
    };
  }

  addItem(item) {
    const normalized = typeof item === "string" ? { label: item, value: item } : item;
    if (!this._items.value.some(i => i.value === normalized.value)) {
      this._items.value = [...this._items.value, normalized];
    }
  }
}
