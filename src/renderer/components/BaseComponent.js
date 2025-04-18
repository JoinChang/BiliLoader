export const Margin = Object.freeze({
    NONE: "none",
    ZERO: "0",
    XS: "xs",
    SM: "sm",
    MD: "md",
    LG: "lg",
    XL: "xl",
    XXL: "xxl",
});

export class BaseComponent {
    constructor({
        margin = {
            marginTop: Margin.NONE,
            marginRight: Margin.NONE,
            marginBottom: Margin.NONE,
            marginLeft: Margin.NONE,
        },
    } = {}) {
        this.component = null;
        this._margin = margin;
    }

    applyBaseStyles(target) {
        const classMap = {
            marginTop: "mt",
            marginRight: "mr",
            marginBottom: "mb",
            marginLeft: "ml",
        };

        for (const [key, prefix] of Object.entries(classMap)) {
            const value = this._margin[key];
            if (value && value !== Margin.NONE) {
                target.classList.add(`${prefix}_${value}`);
            } else if (typeof value === "number") {
                target.style[key] = `${value}px`;
            }
        }
    }

    render() {
        return this.component;
    }
}
