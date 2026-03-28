const { contextBridge, ipcRenderer, webFrame } = require("electron");

(async () => {
  const preloadErrors = {};

  for (const [pluginId, plugin] of Object.entries(BiliLoader.plugins)) {
    // 插件 preload（受限环境：只能访问 contextBridge/webFrame/ipcRenderer/BiliLoader）
    const preloadPath = plugin.path?.injects?.preload;
    if (preloadPath) {
      try {
        const response = await fetch(`local:///${preloadPath}`);
        const code = await response.text();
        runPluginPreloadScript(code);
      } catch (e) {
        preloadErrors[pluginId] = { message: e.message || "Unknown error", stack: e.stack || "" };
      }
    }

    // pageScripts：注入 config + 脚本到 page world
    const pageScripts = plugin.path?.injects?.pageScripts;
    if (pageScripts && pageScripts.length > 0) {
      try {
        const config = ipcRenderer.sendSync("BiliLoader.readPluginConfig", pluginId);
        const configCode = `window.__bililoader_pluginConfig__=window.__bililoader_pluginConfig__||{};window.__bililoader_pluginConfig__[${JSON.stringify(pluginId)}]=${JSON.stringify(config)};`;

        for (const scriptPath of pageScripts) {
          const response = await fetch(`local:///${scriptPath}`);
          const code = await response.text();
          webFrame.executeJavaScriptInIsolatedWorld(0, [
            { code: configCode },
            { code },
          ]);
        }
      } catch (e) {
        preloadErrors[pluginId] = { message: e.message || "Unknown error", stack: e.stack || "" };
      }
    }
  }

  contextBridge.exposeInMainWorld("BiliLoaderPreloadErrors", preloadErrors);
})();
