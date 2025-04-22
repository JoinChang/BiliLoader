import { PluginRendererLoader } from "./plugin_loader/renderer.js";
import { PluginConfigView } from "./renderer/views/PluginConfigView.js";
import { Notification } from "./renderer/components/index.js";

import { getVueRuntime } from "./renderer/utils/vueRuntime.js";
import Components from "./renderer/components/index.js";

window.BiliComponents = Components;

(async () => {
    // 加载 Vue 运行时
    let vueRuntimeURL = await BiliLoader.api.getCache("vueRuntimeURL");
    vueRuntimeURL = await getVueRuntime(vueRuntimeURL);
    await BiliLoader.api.setCache("vueRuntimeURL", vueRuntimeURL);
    console.log("[Renderer] Vue Runtime Loaded");

    // 初始化插件 Renderer
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
