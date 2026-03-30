// 运行在 Electron Preload 环境下的插件脚本
// contextBridge, ipcRenderer, webFrame, BiliLoader 由 runPluginPreloadScript 注入

contextBridge.exposeInMainWorld("__account_switcher__", {
  getAccounts: () => ipcRenderer.invoke("BiliLoader.account-switcher.api", "getAccounts"),
  getCurrentMid: () => ipcRenderer.invoke("BiliLoader.account-switcher.api", "getCurrentMid"),
  saveCurrentAccount: () => ipcRenderer.invoke("BiliLoader.account-switcher.api", "saveCurrentAccount"),
  switchAccount: (mid) => ipcRenderer.invoke("BiliLoader.account-switcher.api", "switchAccount", mid),
  removeAccount: (mid) => ipcRenderer.invoke("BiliLoader.account-switcher.api", "removeAccount", mid),
  addAccount: () => ipcRenderer.invoke("BiliLoader.account-switcher.api", "addAccount"),
  onAccountsChanged: (callback) => {
    ipcRenderer.on("BiliLoader.account-switcher.accountsChanged", callback);
    return () => ipcRenderer.removeListener("BiliLoader.account-switcher.accountsChanged", callback);
  },
});
