import {
  BaseComponent, Checkbox, Margin, Tabs, Title
} from "../components/index.js";
import { ConfigManager } from "../utils/config.js";
import { createAboutSection } from "./AboutSection.js";

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
    this.settings_items = Vue.reactive([]);
  }

  static async createInstance() {
    const config = new ConfigManager("", {
      enabled: true,
      blockAppUpdate: true,
      enableMcpServer: false,
      mcpDebugPort: 9222,
    });
    await config.load();

    const view = new PluginConfigView(config);
    const headerSlot = document.querySelector(".header_slot");
    if (headerSlot && headerSlot.querySelectorAll(".vui_tabs--nav-item").length > 1) {
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
    createAboutSection(this);
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
    vnode.appContext = app.__vue_app__._context;

    const tabs_wrapper = document.querySelector(".header_slot>div");
    tabs_wrapper.innerHTML = "";
    render(vnode, tabs_wrapper);
  }

  renderSettingsWrapper() {
    const { h, render } = Vue;
    const vnode = h(PluginConfigPanel, { items: this.settings_items });
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
          onChange: (value) => this.config.set("enabled", value, { restart: true }),
          margin: { marginTop: Margin.MD },
        }),
        new Checkbox({
          label: "禁用 App 自动更新",
          defaultValue: this.config.get("blockAppUpdate"),
          onChange: (value) => this.config.set("blockAppUpdate", value, { restart: true }),
          margin: { marginTop: Margin.XS },
        }),
        new Checkbox({
          label: "启用 MCP 调试服务器",
          defaultValue: this.config.get("enableMcpServer"),
          onChange: (value) => this.config.set("enableMcpServer", value, { restart: true }),
          margin: { marginTop: Margin.XS },
        }),
      ],
    });
  }

  initializeSettingsWrapper() {
    const original_wrapper = document.querySelector(".settings_content--wrapper");
    original_wrapper.setAttribute("data-bl-tab", "Settings");

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
