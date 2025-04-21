import { PluginRendererLoader } from "./plugin_loader/renderer.js";
import { PluginConfigView } from "./renderer/views/PluginConfigView.js";
import { Notification } from "./renderer/components/index.js";

import { getVueRuntime } from "./renderer/utils/vueRuntime.js";
import Components from "./renderer/components/index.js";

window.BiliComponents = Components;

(async () => {
    const Vue = await getVueRuntime();
    console.log("[Renderer] Vue Runtime Loaded", Vue);

    const loader = new PluginRendererLoader();
    await loader.initialize();

    await new Notification({
        title: "BiliLoader",
        content: `已激活 BiliLoader，共加载 ${Object.keys(BiliLoader.plugins).length} 个插件`,
    }).show();

    navigation.addEventListener("navigatesuccess", async (event) => {
        const url = event.target.currentEntry.url;

        await loader.onPageLoaded(url);

        if (url.includes("/index.html") && url.includes("#/page/settings")) {
            const view = await PluginConfigView.createInstance();

            view && await loader.onSettingsPageLoaded(view);
        }
    });
})();
