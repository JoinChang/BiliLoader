export class PluginRendererLoader {
  pluginExports = {};
  _contexts = {};

  async initialize() {
    const plugins = BiliLoader.plugins || {};

    for (const pluginId in plugins) {
      const plugin = plugins[pluginId];
      const preloadError = BiliLoaderPreloadErrors?.[pluginId];

      if (preloadError) {
        console.error(`[Preload] 插件 ${pluginId} 加载失败:`, preloadError.message, preloadError.stack);
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
          console.error(`[Renderer] 插件 ${pluginId} 加载失败:`, e);
        }
      }
    }

    // 框架自动初始化 config，加载 defaults
    for (const pluginId in this.pluginExports) {
      const ctx = this._getContext(pluginId);
      await ctx.config.load();
    }

    await this.onReady();
  }

  _getContext(pluginId) {
    if (!this._contexts[pluginId]) {
      const module = this.pluginExports[pluginId];
      const defaults = module?.configDefaults || {};
      this._contexts[pluginId] = {
        pluginId,
        config: new window.BiliConfigManager(pluginId, defaults),
        assets: new window.BiliAssetsManager(pluginId),
      };
    }
    return this._contexts[pluginId];
  }

  async _callPluginHook(hookName, ...args) {
    for (const pluginId in this.pluginExports) {
      const plugin = this.pluginExports[pluginId];
      if (typeof plugin[hookName] === "function") {
        try {
          await Promise.resolve(plugin[hookName](...args, this._getContext(pluginId)));
        } catch (e) {
          console.error(`[Renderer] 插件 ${pluginId} ${hookName} 执行出错:`, e);
        }
      }
    }
  }

  async onReady() { await this._callPluginHook("onReady"); }
  async onPageLoaded(url) { await this._callPluginHook("onPageLoaded", url); }
  async onPageUnloaded(url) { await this._callPluginHook("onPageUnloaded", url); }
  async onSettingsPageLoaded(view) { await this._callPluginHook("onSettingsPageLoaded", view); }
}
