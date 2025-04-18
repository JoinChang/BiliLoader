import { PluginRendererLoader } from "./plugin_loader/renderer.js";
import { PluginConfigView } from "./renderer/views/PluginConfigView.js";
import Components from "./renderer/components/index.js";

window.BiliComponents = Components;

const loader = new PluginRendererLoader();
await loader.initialize();

navigation.addEventListener("navigatesuccess", async (event) => {
    const url = event.target.currentEntry.url;

    await loader.onPageLoaded(url);

    if (url.includes("/index.html") && url.includes("#/page/settings")) {
        const view = await PluginConfigView.createInstance();

        view && await loader.onSettingsPageLoaded(view);
    }
});
