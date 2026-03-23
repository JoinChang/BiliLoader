import { PluginRendererLoader } from "./plugin_loader/renderer.js";
import { PluginConfigView } from "./renderer/views/PluginConfigView.js";
import { Notification } from "./renderer/components/index.js";

import { getVueRuntime } from "./renderer/utils/vueRuntime.js";
import Components from "./renderer/components/index.js";

window.BiliComponents = Components;

(async () => {
  // 加载 Vue 运行时
  try {
    await getVueRuntime();
    console.log("[Renderer] Vue Runtime Loaded");
  } catch (e) {
    console.warn("[Renderer] Vue Runtime 加载失败:", e.message);
  }

  // 初始化插件 Renderer
  const loader = new PluginRendererLoader();
  await loader.initialize();

  // 主界面：显示通知和设置页
  if (location.href.includes("/index.html")) {
    await new Notification({
      title: "BiliLoader",
      content: `已激活 BiliLoader，共加载 ${Object.keys(BiliLoader.plugins).length} 个插件`,
    }).show();

    navigation.addEventListener("navigatesuccess", async (event) => {
      const url = event.target.currentEntry.url;
      await loader.onPageLoaded(url);

      if (url.includes("#/page/settings")) {
        const view = await PluginConfigView.createInstance();
        view && await loader.onSettingsPageLoaded(view);
      }
    });
  }

  // 所有页面都触发 onPageLoaded
  await loader.onPageLoaded(location.href);
})();
