import { waitForVueAppContext } from "../utils/vueAppReady.js";

export const NotificationPosition = Object.freeze({
    TOP_LEFT: "top-left",
    TOP_RIGHT: "top-right",
    BOTTOM_LEFT: "bottom-left",
    BOTTOM_RIGHT: "bottom-right",
});

export class Notification {
    constructor({
        title,
        content,
        position = NotificationPosition.BOTTOM_RIGHT,
        offset = 16,
        duration = 5000,
        onClose = () => {},
    }) {
        this._wrapper = document.body;
        this._content = content;
        this._props = {
            position,
            duration,
            offset,
            titleText: title,
            onClose,
        };
    }

    render() {
        const { h, render } = Vue;

        const vnode = h(app.__vue_app__.component("VNotification"), {
            ...this._props,
            "onDestroy": (value) => {
                this._props.visible = value;
                if (!value) this.hide();
            }
        }, {
            default: () => this._content,
        });

        render(vnode, this._wrapper);
    }

    async show() {
        await waitForVueAppContext();
        this.render();
    }

    hide() {
        Vue.render(null, this._wrapper);
    }
}
