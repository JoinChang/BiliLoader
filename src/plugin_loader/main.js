const log = require("electron-log");
const path = require("path");

exports.PluginMainLoader = class {
    constructor() {
        this.pluginExports = {};
    }

    initialize() {
        const plugins = BiliLoader.plugins || {};

        for (const pluginId in plugins) {
            const plugin = plugins[pluginId];
            const mainFile = plugin.manifest?.injects?.main;
            if (!mainFile) continue;

            const mainPath = path.join(plugin.path.plugin, mainFile);

            try {
                const exports = require(mainPath);
                if (typeof exports === "object" && exports !== null) {
                    this.pluginExports[pluginId] = exports;
                } else {
                    log.warn(`[BiliLoader] 插件 ${pluginId} 主脚本未正确导出对象`);
                }
            } catch (e) {
                log.error(`[BiliLoader] 插件 ${pluginId} 主脚本加载失败：`, e);
            }
        }
    }

    onBrowserWindowCreated(window) {
        for (const pluginId in this.pluginExports) {
            const plugin = this.pluginExports[pluginId];
            if (typeof plugin.onBrowserWindowCreated === "function") {
                try {
                    plugin.onBrowserWindowCreated(window);
                } catch (e) {
                    log.error(`[BiliLoader] 插件 ${pluginId} 的 onBrowserWindowCreated 执行出错：`, e);
                }
            }
        }
    }
}
