export class ConfigManager {
  constructor(pluginId = null, defaults = {}) {
    this.pluginId = pluginId;
    this.defaults = defaults;
    this.config = { ...defaults };
    this.loaded = false;
  }

  async load() {
    try {
      const remoteConfig = await BiliLoader.api.readConfig(this.pluginId);
      if (remoteConfig) {
        this.config = { ...this.defaults, ...remoteConfig };
      } else {
        this.config = { ...this.defaults };
      }
      this.loaded = true;
    } catch (e) {
      this.config = { ...this.defaults };
    }
  }

  get(key) {
    if (!this.loaded) {
      throw new Error("配置尚未加载");
    }
    return this.config[key];
  }

  async set(key, value, options = {}) {
    if (!this.loaded) {
      throw new Error("配置尚未加载");
    }
    this.config[key] = value;
    const result = await BiliLoader.api.writeConfig(this.pluginId, this.config);
    if (options.restart) {
      const { ConfirmDialog } = await import("../components/index.js");
      await new ConfirmDialog({
        title: "需要重启",
        content: "设置已更改，需要重启客户端才能生效。",
        confirmText: "立即重启",
        cancelText: "稍后",
        onConfirm: () => BiliLoader.api.relaunch(),
      }).show();
    }
    return result;
  }
}

window.BiliConfigManager = ConfigManager;
