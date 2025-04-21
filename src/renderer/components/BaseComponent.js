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
        this._margin = margin;
        // 在 Component 外层是否包裹一层 Wrapper（样式会对其生效）
        this._wrapper = null;

        // Vue 组件的构造函数
        this._component = null;
        // Vue 组件的 props
        this._props = {};
        // Vue 组件的 slots
        this._slots = {};

        // 渲染后的 DOM 元素
        this.component = null;
    }

    // 初始化 Vue 组件
    _initVNode() {
        return Vue.createVNode(this._component, { ...this._props }, { ...this._slots });
    }

    // 渲染 Vue 组件为 DOM 元素
    render() {
        const { render } = Vue;

        if (this._wrapper) {
            const vnode = this._initVNode();
            render(vnode, this._wrapper);
            this.component = this._wrapper;
        } else {
            const wrapper = document.createElement('div');
            const vnode = this._initVNode();
            render(vnode, wrapper);
            this.component = wrapper.firstChild;
        }

        this._applyBaseStyles(this.component);
        return this.component;
    }

    // 渲染 Vue 组件为 VNode（不包含 Wrapper）
    renderVNode() {
        const vnode = this._initVNode();

        vnode.props = {
            class: (() => {
                const target = document.createElement('div');
                this._applyBaseStyles(target);
                return target.className;
            })(),
            ...vnode.props
        }

        return vnode;
    }

    // 挂载组件
    mount(target) {
        if (this.component) {
            target.appendChild(this.component);
        }
    }

    _applyBaseStyles(target) {
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
}
