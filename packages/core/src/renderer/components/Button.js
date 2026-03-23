import { BaseComponent, Margin } from "./BaseComponent.js";

export const ButtonColor = Object.freeze({
    NONE: "none",
    BLUE: "blue",
    PINK: "pink",
    DANGER: "danger",
    GREY: "grey",
});

export const ButtonSize = Object.freeze({
    SM: "small",
    MD: "middle",
    LG: "large",
});

export const ButtonVariant = Object.freeze({
    FILLED: "filled",
    OUTLINE: "outline",
});

export class Button extends BaseComponent {
    constructor({
        text = "",
        variant = ButtonVariant.FILLED,
        size = ButtonSize.MD,
        color = ButtonColor.NONE,
        rounded = false,
        disabled = false,
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
        this._component = app.__vue_app__.component("VButton");
        this._props = {
            text,
            plain: variant === ButtonVariant.OUTLINE,
            round: rounded,
            disabled,
            onClick,
        };
        if (size !== ButtonSize.MD) {
            this._props.size = size;
        }
        if (color !== ButtonColor.NONE) {
            this._props.type = color;
        }
    }
}
