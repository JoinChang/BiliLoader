import { Button, Checkbox, ConfirmDialog, FlexRow, Margin, Text, Title } from "../components/index.js";
import { ConfigManager } from "../config.js";

export class PluginConfigView {
    constructor(config) {
        this.config = config;
        this.current_tab = null;

        this.tabs = document.querySelector(".vui_tabs--nav");
        this.tab_slider = document.querySelector(".vui_tabs--nav-slider");
        this.settings_wrapper = null;
    }

    static async createInstance() {
        const config = new ConfigManager("", {
            enabled: true,
            blockAppUpdate: false,
            isAppDevMode: false,
        });
        await config.load();

        const view = new PluginConfigView(config);
        if (view.tabs.querySelector("[data-bl-tab='BiliLoader']")) {
            return null;
        }

        view.initialize();
        return view;
    }

    initialize() {
        this.injectStyle();
        this.initializeSettingsWrapper();
        this.createTabsItem({ title: "BiliLoader" });
        this.renderPluginSettings();
        this.renderAboutSection();
        this.bindTabSliderUpdate();
    }

    injectStyle() {
        const style = document.createElement("link");
        style.rel = "stylesheet";
        style.type = "text/css";
        style.href = "local://root/src/renderer/assets/styles.css";
        document.head.appendChild(style);
    }

    renderPluginSettings() {
        this.createSettingsItem({
            name: "BiliLoader",
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
                })
            ]
        });
    }

    renderAboutSection() {
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
                                new ConfirmDialog({
                                    title: "提示",
                                    message: "检查更新功能尚未实现",
                                }).show();
                            }
                        }),
                    ],
                })
            ]
        });
    }

    bindTabSliderUpdate() {
        const reloadSlider = () => {
            if (!this.tab_slider) return;
            const tab = this.tabs.querySelector(`[data-bl-tab="${this.current_tab}"]`);
            if (tab) {
                this.tab_slider.style.left = `${tab.offsetLeft + (tab.offsetWidth - 18) / 2}px`;
            }
        };
        navigation.addEventListener("navigatesuccess", () => setTimeout(reloadSlider, 50));
        window.addEventListener("resize", reloadSlider);
    }

    initializeSettingsWrapper() {
        const original_wrapper = document.querySelector(".settings_content--wrapper");
        original_wrapper.setAttribute("data-bl-tab", "设置");

        // 这里处理一下检查更新按钮的逻辑
        if (this.config.get("blockAppUpdate")) {
            original_wrapper.querySelectorAll(".about-button").forEach(item => {
                if (item.innerText === "检查更新") {
                    item.addEventListener("click", () => {
                        new ConfirmDialog({
                            title: "提示",
                            message: "哼，休想要我检查更新！<(￣︿￣)>"
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

    createTabsItem({ title, onClick }) {
        const clickHandler = (e) => {
            const items = this.tabs.querySelectorAll(".vui_tabs--nav-item");
            items.forEach((item) => {
                item.classList.remove("vui_tabs--nav-item-active");
            });

            const navText = e.currentTarget.querySelector(".vui_tabs--nav-text");
            if (navText) {
                e.currentTarget.classList.add("vui_tabs--nav-item-active");
                this.current_tab = navText.innerText;
            }

            if (this.tab_slider) {
                this.tab_slider.style.left = `${e.currentTarget.offsetLeft + (e.currentTarget.offsetWidth - 18) / 2}px`;
            }

            // 切换页面
            document.getElementsByClassName("settings_content--wrapper").forEach((item) => {
                item.style.display = "none";
            });
            const current_wrapper = document.querySelector(`.settings_content--wrapper[data-bl-tab="${this.current_tab}"]`);
            if (current_wrapper) {
                current_wrapper.style.display = "block";
            }
        }

        // 复制原始的 tab 项
        const original_item = this.tabs.querySelector(".vui_tabs--nav-item");
        original_item.setAttribute("data-bl-tab", original_item.querySelector(".vui_tabs--nav-text").innerText);
        const item = original_item.cloneNode(true);
        item.setAttribute("data-bl-tab", title);
        item.classList.remove("vui_tabs--nav-item-active");
        item.addEventListener("click", (e) => {
            clickHandler(e);
            onClick && onClick();
        });
        item.querySelector(".vui_tabs--nav-text").innerText = title;

        original_item.addEventListener("click", clickHandler);
        original_item.click();
        this.tabs.appendChild(item);
    }

    createSettingsItem({ name, className, children }) {
        const item = document.createElement("div");
        item.classList.add("settings_content--item");
        if (className) item.classList.add(className);

        item.appendChild(new Title({
            text: name,
            order: 4,
            margin: { marginTop: Margin.ZERO },
        }).render());

        children.forEach(child => {
            item.appendChild(child instanceof HTMLElement ? child : child.render());
        });

        const about_item = this.settings_wrapper.querySelector(".bl-about-item");
        about_item ? this.settings_wrapper.insertBefore(item, about_item) : this.settings_wrapper.appendChild(item);
    }
}
