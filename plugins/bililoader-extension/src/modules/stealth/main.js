// 直播间隐身 — 主进程模块
const path = require("path");

const FAKE_ROOM_ID = "273022";
const STEALTH_PRELOAD = path.join(__dirname, "preload.js");

/**
 * 注册隐身功能到窗口
 * @param {BrowserWindow} window
 * @param {Function} isEnabled - 返回当前是否启用隐身
 */
exports.register = (window, isEnabled) => {
  const winSession = window.webContents.session;

  // 阻止心跳上报（维持在线状态）
  if (!winSession.__stealthRegistered) {
    winSession.__stealthRegistered = true;

    winSession.webRequest.onBeforeRequest(
      { urls: ["*://live-trace.bilibili.com/xlive/data-interface/v1/x25Kn/X*"] },
      (details, callback) => {
        if (isEnabled()) {
          callback({ redirectURL: "data:application/json,%7B%22code%22%3A0%7D" });
        } else {
          callback({});
        }
      }
    );

    // 弹幕 WS uid=0（不出现在观众列表）
    try {
      const existing = winSession.getPreloads ? winSession.getPreloads() : [];
      if (!existing.includes(STEALTH_PRELOAD)) {
        winSession.setPreloads([...existing, STEALTH_PRELOAD]);
      }
    } catch (e) {}
  }

  // 入场请求 room_id 替换（阻止入场播报）
  // 使用 CDP Fetch API 透明修改 URL，不破坏 wbi 签名
  if (window.__stealthFetchEnabled) return;
  window.__stealthFetchEnabled = true;

  window.webContents.on("did-start-loading", () => {
    if (!window.webContents.getURL().includes("live.bilibili.com")) return;

    try {
      const dbg = window.webContents.debugger;
      if (!dbg.isAttached()) dbg.attach("1.3");

      dbg.sendCommand("Fetch.enable", {
        patterns: [{ urlPattern: "*getInfoByUser*not_mock_enter_effect*", requestStage: "Request" }],
      });

      dbg.on("message", (event, method, params) => {
        if (method !== "Fetch.requestPaused") return;
        const opts = { requestId: params.requestId };
        if (isEnabled()) {
          opts.url = params.request.url.replace(/room_id=\d+/, "room_id=" + FAKE_ROOM_ID);
        }
        dbg.sendCommand("Fetch.continueRequest", opts).catch(() => {});
      });
    } catch (e) {}
  });
};
