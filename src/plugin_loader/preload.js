const { contextBridge } = require("electron");

(async () => {
    const preloadErrors = {};
    const pluginEntries = Object.entries(BiliLoader.plugins);

    const preloadTasks = pluginEntries.map(async ([pluginId, plugin]) => {
        const preloadPath = plugin.path?.injects?.preload;
        if (!preloadPath) return;

        try {
            const response = await fetch(`local:///${preloadPath}`);
            const code = await response.text();
            runPreloadScript(code);
        } catch (e) {
            preloadErrors[pluginId] = {
                message: e.message || "Unknown error",
                stack: e.stack || ""
            };
        }
    });

    await Promise.allSettled(preloadTasks);

    contextBridge.exposeInMainWorld("BiliLoaderPreloadErrors", preloadErrors);
})();
