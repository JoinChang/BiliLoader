import { BaseComponent, Margin } from "./BaseComponent.js";

export class Checkbox extends BaseComponent {
    constructor({
        label,
        defaultValue = false,
        onChange = () => {},
        margin = {
            marginTop: Margin.MD,
            marginRight: Margin.NONE,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    }) {
        super({
            margin: margin,
        });

        this.component = null;
        this.label = label;
        this.defaultValue = defaultValue;
        this.onChange = onChange;

        this._checkbox = null;

        this.initialize();
        this.applyBaseStyles(this.component);
    }

    initialize() {
        this.component = document.createElement("p");

        this._checkbox = document.createElement("label");
        this._checkbox.classList.add("vui_checkbox", "vui_checkbox--large", "vui_checkbox--pink");
        this._checkbox.classList.remove("vui_checkbox--checked");
        this._checkbox.setAttribute("role", "checkbox");

        const isChecked = this.defaultValue;
        if (isChecked) {
            this._checkbox.classList.add("vui_checkbox--checked");
        }

        this._checkbox.innerHTML = `
            <span class="vui_checkbox--input">
                <input type="checkbox" class="vui_checkbox--input-original" value="${isChecked}">
                <span class="vui_checkbox--input-box"></span>
            </span>
            <span class="vui_checkbox--label">${this.label}</span>
        `;

        this._checkbox.addEventListener("click", (e) => {
            e.preventDefault();
            this._checkbox.classList.toggle("vui_checkbox--checked");
            const checkboxInput = this._checkbox.querySelector(".vui_checkbox--input-original");
            checkboxInput.value = checkboxInput.value !== "true";
            this.onChange && this.onChange(checkboxInput.value === "true");
        });

        this.component.appendChild(this._checkbox);
    }
}