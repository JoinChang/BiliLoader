import {
    BaseComponent, Button, Checkbox, ConfirmDialog, FlexRow, Margin, RadioGroup, Tabs, Text, Title
} from "../components/index.js";
import { ConfigManager } from "../config.js";

const PluginConfigPanel = {
    props: {
        items: Array,
    },
    setup(props) {
        const { h, Fragment } = Vue;

        return () => h(Fragment, null, [
            ...props.items.map(item => {
                return h("div", { class: "settings_content--item" }, [
                    new Title({
                        text: item.name,
                        order: 4,
                        margin: { marginTop: Margin.ZERO },
                    }).renderVNode(),
                    ...item.children.map(child => {
                        if (child instanceof BaseComponent) {
                            return child.renderVNode();
                        }
                        return child;
                    })
                ]);
            })
        ]);
    }
};

export class PluginConfigView {
    constructor(config) {
        this.config = config;
        this.settings_wrapper = null;
        this.settings_items = Vue.reactive([
            // { name: "BiliLoader", className: "", children: [...] }
        ]);
    }

    static async createInstance() {
        const config = new ConfigManager("", {
            enabled: true,
            blockAppUpdate: false,
            isAppDevMode: false,
        });
        await config.load();

        const view = new PluginConfigView(config);
        if (document.getElementsByClassName("vui_tabs--nav-item").length > 1) {
            return null;
        }

        view.initialize();
        return view;
    }

    initialize() {
        this.injectStyle();
        this.renderTabs();
        this.initializeSettingsWrapper();
        this.renderSettingsWrapper();
        this._renderPluginSettings();
        this._renderAboutSection();
    }

    injectStyle() {
        const style = document.createElement("link");
        style.rel = "stylesheet";
        style.type = "text/css";
        style.href = "local://root/src/renderer/assets/styles.css";
        document.head.appendChild(style);
    }

    renderTabs() {
        const { render } = Vue;

        const vnode = new Tabs({
            defaultValue: "Settings",
            tabs: [
                { label: "设置", value: "Settings" },
                { label: "BiliLoader", value: "BiliLoader" },
            ],
            onTabChange: (tab) => {
                document.getElementsByClassName("settings_content--wrapper").forEach((item) => {
                    item.style.display = "none";
                });
                const current_wrapper = document.querySelector(`.settings_content--wrapper[data-bl-tab="${tab}"]`);
                if (current_wrapper) {
                    current_wrapper.style.display = "block";
                }
            },
        }).renderVNode();
        vnode.appContext = app.__vue_app__._context; // 继承上下文

        const tabs_wrapper = document.querySelector(".header_slot>div");
        tabs_wrapper.innerHTML = "";
        render(vnode, tabs_wrapper);
    }

    renderSettingsWrapper() {
        const { h, render } = Vue;

        const vnode = h(PluginConfigPanel, { items: this.settings_items });
        vnode.appContext = app.__vue_app__._context; // 继承上下文

        render(vnode, this.settings_wrapper);
    }

    _renderPluginSettings() {
        this.createSettingsItem({
            name: "BiliLoader",
            className: "bl-plugin-item",
            children: [
                new Checkbox({
                    label: "启用插件",
                    defaultValue: this.config.get("enabled"),
                    onChange: async (value) => {
                        await this.config.set("enabled", value);
                    }
                }),
                new Checkbox({
                    label: "禁止 App 检查更新",
                    defaultValue: this.config.get("blockAppUpdate"),
                    onChange: async (value) => {
                        await this.config.set("blockAppUpdate", value);
                    },
                    margin: { marginTop: Margin.XS },
                }),
                new Checkbox({
                    label: "启用 App 开发者模式",
                    defaultValue: this.config.get("isAppDevMode"),
                    onChange: async (value) => {
                        await this.config.set("isAppDevMode", value);
                    },
                    margin: { marginTop: Margin.XS },
                }),
                new RadioGroup({
                    label: "测试控件",
                    defaultValue: "test1",
                    options: [
                        { label: "test1", value: "test1" },
                        { label: "test2", value: "test2" },
                        { label: "test3", value: "test3", disabled: true },
                    ],
                    onChange: (val) => console.log("当前选择：", val),
                })
            ]
        });
    }

    _renderAboutSection() {
        this.createSettingsItem({
            name: "关于 BiliLoader",
            className: "bl-about-item",
            children: [
                new Text({
                    text: `BiliLoader 版本：${BiliLoader.versions.bili_loader}`,
                    fontSize: 5,
                }),
                new Text({
                    text: `Node 版本：${BiliLoader.versions.node}`,
                    fontSize: 5,
                    margin: { marginTop: Margin.XS },
                }),
                new Text({
                    text: `Chromium 版本：${BiliLoader.versions.chrome}`,
                    fontSize: 5,
                    margin: { marginTop: Margin.XS },
                }),
                new Text({
                    text: `Electron 版本：${BiliLoader.versions.electron}`,
                    fontSize: 5,
                    margin: { marginTop: Margin.XS },
                }),
                new FlexRow({
                    children: [
                        new Button({
                            text: "打开配置目录",
                            onClick: async () => {
                                await BiliLoader.api.openExternal(BiliLoader.path.profile);
                            },
                        }),
                        new Button({
                            text: "检查更新",
                            onClick: async () => {
                                await new ConfirmDialog({
                                    title: "提示",
                                    content: "检查更新功能尚未实现",
                                }).show();
                            }
                        }),
                    ],
                })
            ]
        });
    }

    initializeSettingsWrapper() {
        const original_wrapper = document.querySelector(".settings_content--wrapper");
        original_wrapper.setAttribute("data-bl-tab", "Settings");

        // 这里处理一下检查更新按钮的逻辑
        if (this.config.get("blockAppUpdate")) {
            original_wrapper.querySelectorAll(".about-button").forEach(item => {
                if (item.innerText === "检查更新") {
                    item.addEventListener("click", async () => {
                        await new ConfirmDialog({
                            title: "提示",
                            content: "哼，休想要我检查更新！<(￣︿￣)>"
                        }).show();
                    });
                }
            });
        }

        const wrapper = original_wrapper.cloneNode(true);
        wrapper.setAttribute("data-bl-tab", "BiliLoader");
        wrapper.setAttribute("style", "display: none;");
        wrapper.innerHTML = "";

        this.settings_wrapper = wrapper;
        original_wrapper.parentNode.appendChild(wrapper);
    }

    createSettingsItem({ name, className, children }) {
        const newItem = { name, className, children };

        if (className === "bl-about-item") {
            this.settings_items.push(newItem);
        } else {
            const index = this.settings_items.findIndex(
                item => item.className === "bl-about-item"
            );
            if (index === -1) {
                this.settings_items.push(newItem);
            } else {
                this.settings_items.splice(index, 0, newItem);
            }
        }
    }
}
