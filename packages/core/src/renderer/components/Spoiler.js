import { BaseComponent, Margin } from "./BaseComponent.js";

const FOLD_ICON_PATH = "M5.46967 9.17678C5.76256 9.46967 6.23744 9.46967 6.53033 9.17678L10.7286 4.97855C10.9238 4.78329 10.9238 4.46671 10.7286 4.27145C10.5333 4.07618 10.2167 4.07618 10.0214 4.27145L6 8.29289L1.97855 4.27145C1.78329 4.07618 1.46671 4.07618 1.27145 4.27145C1.07618 4.46671 1.07618 4.78329 1.27145 4.97855L5.46967 9.17678Z";

export class Spoiler extends BaseComponent {
  constructor({
    expandText = "展开更多",
    collapseText = "收起",
    collapsedHeight = 0,
    defaultExpanded = false,
    children = [],
    margin = {
      marginTop: Margin.NONE,
      marginRight: Margin.NONE,
      marginBottom: Margin.NONE,
      marginLeft: Margin.NONE,
    },
  }) {
    super({ margin });
    this._expandText = expandText;
    this._collapseText = collapseText;
    this._collapsedHeight = collapsedHeight;
    this._children = children;

    this._component = {
      setup: () => {
        const expanded = Vue.ref(defaultExpanded);
        const needsSpoiler = Vue.ref(false);
        let contentEl = null;
        let observer = null;

        const measure = () => {
          if (!contentEl || this._collapsedHeight <= 0) return;
          const prev = contentEl.style.maxHeight;
          const prevO = contentEl.style.overflow;
          contentEl.style.maxHeight = 'none';
          contentEl.style.overflow = 'visible';
          needsSpoiler.value = contentEl.scrollHeight > this._collapsedHeight;
          contentEl.style.maxHeight = prev;
          contentEl.style.overflow = prevO;
        };

        const bindRef = (el) => {
          if (el === contentEl) return;
          if (observer) observer.disconnect();
          contentEl = el;
          if (!el) return;
          requestAnimationFrame(measure);
          observer = new MutationObserver(() => requestAnimationFrame(measure));
          observer.observe(el, { childList: true, subtree: true });
        };

        return () => {
          const { h } = Vue;

          const contentStyle = {};
          if (this._collapsedHeight > 0 && !expanded.value && needsSpoiler.value) {
            contentStyle.maxHeight = this._collapsedHeight + 'px';
            contentStyle.overflow = 'hidden';
          }

          const content = h("div", {
            ref: bindRef,
            class: "bl-spoiler--content",
            style: contentStyle,
          }, this._children.map(c => c.renderVNode ? c.renderVNode() : c));

          const icon = h("svg", {
            class: "bl-spoiler--icon",
            viewBox: "0 0 12 12",
            style: expanded.value ? "transform: rotate(180deg);" : "",
          }, [h("path", { "fill-rule": "evenodd", "clip-rule": "evenodd", d: FOLD_ICON_PATH })]);

          const toggle = needsSpoiler.value
            ? h("div", {
                class: "bl-spoiler--toggle",
                onClick: () => { expanded.value = !expanded.value; },
              }, [
                h("div", { class: "bl-spoiler--text" }, expanded.value ? this._collapseText : this._expandText),
                icon,
              ])
            : null;

          return h("div", null, [content, toggle]);
        };
      }
    };
  }
}
