export class PluginRendererLoader {
    pluginExports = {};

    async initialize() {
        const plugins = BiliLoader.plugins || {};

        for (const pluginId in plugins) {
            const plugin = plugins[pluginId];
            const preloadError = BiliLoaderPreloadErrors?.[pluginId];

            if (preloadError) {
                console.error(`[Preload] 插件 ${pluginId} 加载失败: ${preloadError.message}\n${preloadError.stack}`);
            }

            const rendererPath = plugin.path?.injects?.renderer;
            if (rendererPath) {
                try {
                    const module = await import(`local:///${rendererPath}`);
                    if (typeof module === "object" && module !== null) {
                        this.pluginExports[pluginId] = module;
                    } else {
                        console.warn(`[Renderer] 插件 ${pluginId} 没有正确导出对象`);
                    }
                } catch (e) {
                    console.error(`[Renderer] 插件 ${pluginId} 加载失败: ${e.message}\n${e.stack}`);
                }
            }
        }

        await this.onReady();
    }

    async onReady() {
        for (const pluginId in this.pluginExports) {
            const plugin = this.pluginExports[pluginId];
            if (typeof plugin.onReady === "function") {
                try {
                    await Promise.resolve(plugin.onReady());
                } catch (e) {
                    console.error(`[Renderer] 插件 ${pluginId} onInit 执行出错: ${e.message}`);
                }
            }
        }
    }

    async onPageLoaded(url) {
        for (const pluginId in this.pluginExports) {
            const plugin = this.pluginExports[pluginId];
            if (typeof plugin.onPageLoaded === "function") {
                try {
                    await Promise.resolve(plugin.onPageLoaded(url));
                } catch (e) {
                    console.error(`[Renderer] 插件 ${pluginId} onPageLoaded 执行出错: ${e.message}`);
                }
            }
        }
    }

    async onSettingsPageLoaded(view) {
        for (const pluginId in this.pluginExports) {
            const plugin = this.pluginExports[pluginId];
            if (typeof plugin.onSettingsPageLoaded === "function") {
                try {
                    const container = document.createElement("div");
                    await Promise.resolve(plugin.onSettingsPageLoaded(container));
                    view.createSettingsItem({
                        name: BiliLoader.plugins[pluginId].manifest.name,
                        children: [container],
                    });
                } catch (e) {
                    console.error(`[Renderer] 插件 ${pluginId} onSettingsPageLoaded 执行出错: ${e.message}`);
                }
            }
        }
    }
}
