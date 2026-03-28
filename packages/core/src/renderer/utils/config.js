export class ConfigManager {
  constructor(pluginId = null, defaults = {}) {
    this.pluginId = pluginId;
    this.defaults = defaults;
    this.config = { ...defaults };
    this.loaded = false;
    this._listeners = [];
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
      this._syncToPageWorld();
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
    const oldValue = this.config[key];
    this.config[key] = value;
    const result = await BiliLoader.api.writeConfig(this.pluginId, this.config);
    if (result) {
      this._syncToPageWorld();
      this._listeners.forEach(fn => fn(key, value));
    } else {
      this.config[key] = oldValue; // 回滚
      const { ConfirmDialog } = await import("../components/index.js");
      new ConfirmDialog({
        title: "错误",
        content: "设置保存失败，请检查是否有权限修改配置文件",
      }).show();
      return false;
    }
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

  _syncToPageWorld() {
    if (!this.pluginId) return;
    window.__bililoader_pluginConfig__ = window.__bililoader_pluginConfig__ || {};
    window.__bililoader_pluginConfig__[this.pluginId] = { ...this.config };
  }

  onChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(fn => fn !== listener);
    };
  }
}

Object.defineProperty(window, "BiliConfigManager", { value: ConfigManager, writable: false, configurable: false });
