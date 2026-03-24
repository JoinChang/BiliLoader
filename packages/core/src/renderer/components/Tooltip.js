import { BaseComponent, Margin } from "./BaseComponent.js";

const QUESTION_ICON = '<path d="M12 3.749a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5zm-10.25 8.25c0-5.66 4.59-10.25 10.25-10.25s10.25 4.59 10.25 10.25-4.59 10.25-10.25 10.25-10.25-4.59-10.25-10.25z" fill="currentColor"/><path d="M13.125 16.124a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0zM12 8.999a1 1 0 0 0-1 1 1 1 0 1 1-2 0 3 3 0 1 1 6 0 2.82 2.82 0 0 1-.674 1.859c-.177.215-.37.399-.534.55-.05.048-.098.091-.143.132-.112.103-.21.191-.31.291-.229.23-.294.376-.315.437a.623.623 0 0 0-.024.231 1 1 0 1 1-2 0c0-.159-.003-.488.134-.886.137-.396.389-.793.792-1.196.134-.135.28-.268.402-.38l.107-.097c.15-.14.26-.248.346-.353A.83.83 0 0 0 13 10a1 1 0 0 0-1-1z" fill="currentColor"/>';

export class Tooltip extends BaseComponent {
  constructor({
    text = "",
    placement = "right",
    arrow = true,
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

    this._component = {
      setup: () => {
        const { h } = Vue;
        const VDropdown = app.__vue_app__.component("VDropdown");

        return () => h(VDropdown, {
          placement,
          trigger: "hover",
          offset: 10,
        }, {
          default: () => h("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 24 24",
            width: "18",
            height: "18",
            class: "text3 mr_n4 cs_pointer",
            innerHTML: QUESTION_ICON,
          }),
          content: () => h("div", {
            class: arrow ? "bl-tooltip-help" : undefined,
            style: "width: 220px; text-align: justify; position: relative;",
          }, [
            h("p", {
              class: "b_text pd_sm mg_0",
            }, text),
          ]),
        });
      },
    };
  }
}
