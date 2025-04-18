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

    async set(key, value) {
        if (!this.loaded) {
            throw new Error("配置尚未加载");
        }
        this.config[key] = value;
        return BiliLoader.api.writeConfig(this.pluginId, this.config);
    }
}

window.BiliConfigManager = ConfigManager;
