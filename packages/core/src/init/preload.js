const { ipcRenderer, contextBridge } = require("electron");

function invokeAPI(method, args) {
  return ipcRenderer.invoke("BiliLoader.BiliLoader.api", method, args);
}

// 在 Preload 中注入 BiliLoader 对象
Object.defineProperty(globalThis, "BiliLoader", {
  value: {
    ...ipcRenderer.sendSync("BiliLoader.BiliLoader.BiliLoader"),
    api: {
      readConfig: (...args) => invokeAPI("readConfig", args),
      writeConfig: (...args) => invokeAPI("writeConfig", args),
      openExternal: (...args) => invokeAPI("openExternal", args),
      openFolder: (...args) => invokeAPI("openFolder", args),
      relaunch: () => invokeAPI("relaunch", []),
      setCache: (...args) => invokeAPI("setCache", args),
      getCache: (...args) => invokeAPI("getCache", args),
    },
  }
});

contextBridge.exposeInMainWorld("BiliLoader", BiliLoader);

// 劫持客户端方法: window.biliBridgePc.callNativeSync()
const originalSendSync = ipcRenderer.sendSync;
ipcRenderer.sendSync = function (channel, ...args) {
  // 不让客户端屏蔽 console.log 等方法
  if (channel === "config/getIsShowConsoleLog") {
    return true;
  }
  return originalSendSync.call(this, channel, ...args);
};

// 监听 ipcMain 日志事件
ipcRenderer.on("BiliLoader.BiliLoader.log", (event, ...args) => {
  console.log(
    "%cBili%cLoader%c → %s",
    "color: #00BFFF; font-weight: bold",
    "color: #FF69B4; font-weight: bold",
    "color: #999999",
    args.join(" ")
  );
});
