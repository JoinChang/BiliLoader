// 加载渲染进程
document.addEventListener("DOMContentLoaded", () => {
  const script = document.createElement("script");
  script.type = "module";
  script.src = `local://root/src/renderer.js`;
  document.head.prepend(script);
});

// 框架内部脚本执行
Object.defineProperty(globalThis, "runPreloadScript", {
  configurable: false,
  value: (content) => {
    const fn = new Function(
      "require", "process", "Buffer", "global",
      "setImmediate", "clearImmediate", "exports", "module",
      content
    );
    const exports = {};
    const module = { exports };
    return fn(require, process, Buffer, globalThis, setImmediate, clearImmediate, exports, module);
  }
});

// 插件 preload 脚本执行
const { contextBridge, webFrame, ipcRenderer } = require("electron");
Object.defineProperty(globalThis, "runPluginPreloadScript", {
  configurable: false,
  value: (content) => {
    const fn = new Function(
      "contextBridge", "webFrame", "ipcRenderer",
      "BiliLoader",
      "exports", "module",
      content
    );
    const exports = {};
    const module = { exports };
    return fn(contextBridge, webFrame, ipcRenderer, globalThis.BiliLoader, exports, module);
  }
});

// 加载框架 Preload（完整权限）
(async () => {
  runPreloadScript(await (await fetch(`local://root/src/init/preload.js`)).text());
  runPreloadScript(await (await fetch(`local://root/src/plugin_loader/preload.js`)).text());
})();
