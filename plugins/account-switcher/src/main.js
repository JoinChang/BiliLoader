// 运行在 Electron 主进程下的插件入口
const { ipcMain, session } = require("electron");

function getAccounts() {
  const accounts = biliApp.storeService.getSavedAccounts() || [];
  return accounts.map(({ mid, uname, face, vipType, level, savedAt }) => ({
    mid, uname, face, vipType, level, savedAt,
  }));
}

function getCurrentMid() {
  const userInfo = biliApp.storeService.getUserInfo();
  return userInfo?.isLogin ? userInfo.mid : null;
}

function saveCurrentAccount() {
  const userInfo = biliApp.storeService.getUserInfo();
  if (!userInfo?.isLogin) return false;

  const cookies = biliApp.storeService.getAuthCookies() || [];
  if (cookies.length === 0) return false;

  const refreshToken = biliApp.storeService.getRefreshToken();
  const accounts = biliApp.storeService.getSavedAccounts() || [];

  const entry = {
    mid: userInfo.mid,
    uname: userInfo.uname,
    face: userInfo.face,
    vipType: userInfo.vip?.type || 0,
    level: userInfo.level_info?.current_level || 0,
    cookies,
    refreshToken,
    savedAt: Date.now(),
  };

  const idx = accounts.findIndex(a => a.mid === entry.mid);
  if (idx >= 0) {
    accounts[idx] = entry;
  } else {
    accounts.push(entry);
  }
  biliApp.storeService.setSavedAccounts(accounts);
  return true;
}

async function switchAccount(mid) {
  const accounts = biliApp.storeService.getSavedAccounts() || [];
  const target = accounts.find(a => a.mid === mid);
  if (!target) return { success: false, error: "账号不存在" };

  const userInfo = biliApp.storeService.getUserInfo();
  if (userInfo?.isLogin && userInfo.mid === mid) return { success: true };

  saveCurrentAccount();

  try {
    biliApp.storeService.setAuthCookies(target.cookies);
    biliApp.storeService.setRefreshToken(target.refreshToken);
    await biliApp.authService.updateBiliCookie();

    // 用新 cookie 从 API 拉取完整 userInfo 并写入 store
    const newInfo = await biliApp.fetchService.getUserInfo();
    if (newInfo?.isLogin) {
      biliApp.storeService.setUserInfo(newInfo);
    }

    return { success: true, uname: target.uname };
  } catch (e) {
    console.error("[account-switcher] 切换账号失败:", e);
    return { success: false, error: e.message };
  }
}

function removeAccount(mid) {
  const accounts = biliApp.storeService.getSavedAccounts() || [];
  const updated = accounts.filter(a => a.mid !== mid);
  biliApp.storeService.setSavedAccounts(updated);
  return true;
}

async function addAccount() {
  saveCurrentAccount();

  const prevMid = getCurrentMid();
  biliApp.windowFactory.createOrFocusLoginWindow();

  // 轮询 minilogin partition 的 cookie，检测新账号登录
  const minilogin = session.fromPartition('minilogin');
  const pollTimer = setInterval(async () => {
    try {
      const cookies = await minilogin.cookies.get({
        url: 'https://www.bilibili.com',
        domain: '.bilibili.com',
      });
      const jct = cookies.find(c => c.name === 'bili_jct' && c.value);
      const uid = cookies.find(c => c.name === 'DedeUserID' && c.value);

      if (jct && uid && Number(uid.value) !== prevMid) {
        clearInterval(pollTimer);

        // 将 minilogin cookie 合并到 authCookies
        const loginCookies = cookies.filter(c => c.value).map(c => ({
          name: c.name,
          value: c.value,
          expirationDate: c.expirationDate || undefined,
        }));
        const authCookies = biliApp.storeService.getAuthCookies() || [];
        for (const ck of loginCookies) {
          const idx = authCookies.findIndex(a => a.name === ck.name);
          if (idx >= 0) authCookies[idx] = ck;
          else authCookies.push(ck);
        }
        biliApp.storeService.setAuthCookies(authCookies);
        await biliApp.authService.updateBiliCookie();
        await biliApp.authService.refreshUserInfo();
        saveCurrentAccount();
        minilogin.clearStorageData({ storages: ['cookies'] });

        // 重启以刷新 UI
        const { app } = require('electron');
        app.relaunch();
        app.quit();
      }
    } catch {}
  }, 1000);

  setTimeout(() => { clearInterval(pollTimer); }, 300000);
}

const methods = {
  getAccounts,
  getCurrentMid,
  saveCurrentAccount,
  switchAccount,
  removeAccount,
  addAccount,
};

exports.onBrowserWindowCreated = (_window, { readConfig }) => {
  if (exports._ipcRegistered) return;
  exports._ipcRegistered = true;

  ipcMain.handle("BiliLoader.account-switcher.api", async (_event, method, ...args) => {
    const fn = methods[method];
    if (!fn) throw new Error(`未知方法: ${method}`);
    return await fn(...args);
  });
};
