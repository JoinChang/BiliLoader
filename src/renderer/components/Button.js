import { BaseComponent, Margin } from "./BaseComponent.js";

export const ButtonColor = Object.freeze({
    NONE: "none",
    BLUE: "blue",
    PINK: "pink",
    DANGER: "danger",
    GREY: "grey",
});

export const ButtonSize = Object.freeze({
    SM: "sm",
    MD: "md",
    LG: "lg",
});

export const ButtonVariant = Object.freeze({
    FILLED: "filled",
    OUTLINE: "outline",
});

export class Button extends BaseComponent {
    constructor({
        text = "",
        variant = ButtonVariant.FILLED,
        color = ButtonColor.NONE,
        size = ButtonSize.MD,
        onClick = () => {},
        margin = {
            marginTop: Margin.NONE,
            marginRight: Margin.SM,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    }) {
        super({
            margin: margin,
        });

        this.component = document.createElement("button");
        this.component.classList.add("vui_button");
        if (variant === ButtonVariant.OUTLINE) {
            this.component.classList.add("vui_button--plain");
        }
        if (color !== ButtonColor.NONE) {
            this.component.classList.add("vui_button--color");
        }
        if (size !== ButtonSize.MD) {
            this.component.classList.add(`vui_button--${size}`);
        }

        this.component.innerText = text;

        this.component.addEventListener("click", (e) => {
            e.preventDefault();
            onClick && onClick();
        });

        this.applyBaseStyles(this.component);
    }
}
