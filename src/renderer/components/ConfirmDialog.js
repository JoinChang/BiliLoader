export class ConfirmDialog {
    constructor({
        title,
        message,
        confirmText = "确认",
        cancelText = "取消",
        danger = false,
        onConfirm = () => {},
        onCancel = () => {},
    }) {
        this.dialog = document.createElement("div");
        this.dialog.className = "vui_dialog--root";
        this.dialog.innerHTML = `
            <div class="vui_dialog--mask"></div>
            <div class="vui_dialog--wrapper">
                <div class="vui_dialog--content i_dialog py_lg" style="width: 320px;">
                    <div class="vui_dialog--close">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd"
                                d="M0.47 0.47c-0.29 0.29-0.29 0.76 0 1.06L6.01 7.07l-5.54 5.54c-0.29 0.29-0.29 0.76 0 1.06s0.76 0.29 1.06 0l5.54-5.54 5.54 5.54c0.29 0.29 0.76 0.29 1.06 0s0.29-0.76 0-1.06L8.13 7.07l5.54-5.54c0.29-0.29 0.29-0.76 0-1.06s-0.76-0.29-1.06 0L7.07 6.01 1.53 0.47C1.24 0.18 0.76 0.18 0.47 0.47Z"
                                fill="#9499A0"></path>
                        </svg>
                    </div>
                    <div class="content-wrapper">
                        <h3 class="b_text text1 text_center mt_sm">${title}</h3>
                        <p class="b_text text2 text_center mt_md">${message}</p>
                        <div class="mt_xl text_center dialog_btns">
                            <button class="vui_button mr_sm cancel">${cancelText}</button>
                            <button class="vui_button ${danger ? 'vui_button--danger' : 'vui_button--pink'} confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.dialog);

        this.dialog.querySelector(".vui_dialog--close").onclick =
        this.dialog.querySelector(".cancel").onclick = () => {
            this.hide();
            onCancel && onCancel();
        };

        this.dialog.querySelector(".confirm").onclick = () => {
            this.hide();
            onConfirm && onConfirm();
        };
    }

    show() {
        this.dialog.style.display = "block";
    }

    hide() {
        this.dialog.remove();
    }
}
