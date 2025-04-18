import { BaseComponent, Margin } from "./BaseComponent.js";
import { Text } from "./Text.js";

export class RadioGroup extends BaseComponent {
    constructor({
        label,
        defaultValue,
        options = [],
        horizontal = false,
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
        this.options = options;
        this.horizontal = horizontal;
        this.onChange = onChange;

        this._radio_group = null;

        this.initialize();
        this.applyBaseStyles(this.component);
    }

    initialize() {
        this.component = document.createElement("div");

        const title = new Text({
            text: this.label,
        });
        this.component.appendChild(title.render());

        this._radio_group = document.createElement("div");
        this._radio_group.classList.add("vui_radio-group", "mt_sm");

        for (const option of this.options) {
            const radio = document.createElement("label");
            radio.classList.add("vui_radio", "vui_radio--large", "vui_radio--pink");
            radio.classList.remove("vui_radio--checked");
            radio.setAttribute("role", "radio");

            const isChecked = option.value === this.defaultValue;
            if (isChecked) {
                radio.classList.add("vui_radio--checked");
            }

            radio.innerHTML = `
                <span class="vui_radio--input">
                    <input type="radio" class="vui_radio--input-original" value="${option.value}" name="${this.label}" ${isChecked ? "checked" : ""}>
                    <span class="vui_radio--input-box"></span>
                </span>
                <span class="vui_radio--label">${option.label}</span>
            `;

            this._radio_group.appendChild(radio);

            if (this.horizontal && this.options.indexOf(option) < this.options.length - 1) {
                this._radio_group.appendChild(document.createElement("br"));
            }
        }

        this.component.appendChild(this._radio_group);
        this._radio_group.addEventListener("change", (e) => {
            const radios = this._radio_group.querySelectorAll(".vui_radio");
            radios.forEach((radio) => {
                radio.classList.remove("vui_radio--checked");
                radio.querySelector("input").checked = false;
            });

            const selectedRadio = e.target.closest(".vui_radio");
            selectedRadio.classList.add("vui_radio--checked");
            selectedRadio.querySelector("input").checked = true;

            const value = e.target.value;
            this.onChange && this.onChange(value);
        });
    }

    setValue(value) {
        const radio = this._radio_group.querySelector(`input[value="${value}"]`);
        if (radio) {
            radio.checked = true;
        }
    }

    getValue() {
        const radio = this._radio_group.querySelector('input[type="radio"]:checked');
        return radio ? radio.value : null;
    }
}
