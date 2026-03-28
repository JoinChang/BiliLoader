import { Button, ButtonColor } from "./Button.js";
import { Margin } from "./BaseComponent.js";
import { waitForVueAppContext } from "../utils/vueAppReady.js";

class BaseDialog {
  constructor(props) {
    this._wrapper = document.createElement("div");
    this._props = {
      visible: false,
      center: true,
      isShowDefaultFooter: false,
      ...props,
    };
  }

  _renderContent() {
    throw new Error("子类必须实现 _renderContent");
  }

  render() {
    const { h, render } = Vue;
    const vnode = h(app.__vue_app__.component("VDialog"), {
      ...this._props,
      "onUpdate:visible": (value) => {
        this._props.visible = value;
        if (!value) this.hide();
      }
    }, {
      default: () => this._renderContent(h),
    });
    render(vnode, this._wrapper);
  }

  async show() {
    await waitForVueAppContext();
    this._props.visible = true;
    this.render();
  }

  hide() {
    Vue.render(null, this._wrapper);
  }
}

export class ContentDialog extends BaseDialog {
  constructor({ title, content, width = 620 }) {
    super({ width, className: "i_dialog pl_lg pr_md" });
    this._title = title;
    this._content = content;
  }

  _renderContent(h) {
    const content = typeof this._content === 'function'
      ? this._content(h)
      : h("div", { class: "scrollbar_sm", style: "max-height: 60vh; overflow-y: auto;" }, this._content);

    return h("div", { class: "content-wrapper" }, [
      h("h3", { class: "b_text text1 text_center mt_nsm" }, this._title),
      h("div", { class: "mt_sm", style: "text-align: left;" }, [content]),
    ]);
  }
}

export class ConfirmDialog extends BaseDialog {
  constructor({
    title, content,
    confirmText = "确认", cancelText = "取消",
    width = 320, danger = false,
    onConfirm = () => {}, onCancel = () => {},
  }) {
    super({ width, className: "i_dialog py_lg" });
    this._title = title;
    this._content = content;
    this._confirmText = confirmText;
    this._cancelText = cancelText;
    this._danger = danger;
    this._props.onConfirm = onConfirm;
    this._props.onCancel = onCancel;
  }

  _renderContent(h) {
    return h("div", { class: "content-wrapper" }, [
      h("h3", { class: "b_text text1 text_center mt_sm" }, this._title),
      h("p", { class: "b_text text2 text_center mt_md" }, this._content),
      h("div", { class: "mt_xl text_center dialog_btns" }, [
        new Button({
          text: this._cancelText,
          onClick: () => { this._props.onCancel(); this.hide(); },
        }).renderVNode(),
        new Button({
          text: this._confirmText,
          color: this._danger ? ButtonColor.DANGER : ButtonColor.PINK,
          onClick: () => { this._props.onConfirm(); this.hide(); },
          margin: { marginRight: Margin.NONE },
        }).renderVNode(),
      ]),
    ]);
  }
}
