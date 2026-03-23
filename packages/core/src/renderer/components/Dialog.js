import { Button, ButtonColor } from "./Button.js";
import { Margin } from "./BaseComponent.js";
import { waitForVueAppContext } from "../utils/vueAppReady.js";

export class ConfirmDialog {
    constructor({
        title,
        content,
        confirmText = "确认",
        cancelText = "取消",
        width = 320,
        danger = false,
        onConfirm = () => {},
        onCancel = () => {},
    }) {
        this._wrapper = document.createElement("div");
        this._title = title;
        this._content = content;
        this._confirmText = confirmText;
        this._cancelText = cancelText;
        this._danger = danger;
        this._props = {
            visible: false,
            width,
            className: "i_dialog py_lg",
            center: true,
            isShowDefaultFooter: false,
            onConfirm,
            onCancel,
        };
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
            default: () => h("div", { class: "content-wrapper" }, [
                h("h3", { class: "b_text text1 text_center mt_sm" }, this._title),
                h("p", { class: "b_text text2 text_center mt_md" }, this._content),
                h("div", { class: "mt_xl text_center dialog_btns" }, [
                    new Button({
                        text: this._cancelText,
                        onClick: () => {
                            this._props.onCancel();
                            this.hide();
                        }
                    }).renderVNode(),
                    new Button({
                        text: this._confirmText,
                        color: this._danger ? ButtonColor.DANGER : ButtonColor.PINK,
                        onClick: () => {
                            this._props.onConfirm();
                            this.hide();
                        },
                        margin: { marginRight: Margin.NONE }
                    }).renderVNode(),
                ])
            ]),
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
