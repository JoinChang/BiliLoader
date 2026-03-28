const https = require("https");
const { getWbiKeys, signWbi } = require("./wbi.js");

const FAKE_ROOM_ID = "273022";

async function getAnonDanmuToken(roomId, session) {
  const keys = await getWbiKeys();
  if (!keys) return "";

  const query = signWbi({ id: String(roomId), type: "0" }, keys.imgKey, keys.subKey);
  const url = `https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?${query}`;

  let buvid3 = "";
  try { buvid3 = (await session.cookies.get({ name: "buvid3" }))[0]?.value || ""; } catch { }

  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://live.bilibili.com/",
        "Cookie": `buvid3=${buvid3}`,
      },
    }, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try { resolve(JSON.parse(data).data?.token || ""); }
        catch { resolve(""); }
      });
    }).on("error", () => resolve(""));
  });
}

exports.register = (window, isEnabled) => {
  if (!isEnabled()) return;

  const winSession = window.webContents.session;

  if (!winSession.__stealthRegistered) {
    winSession.__stealthRegistered = true;

    // 阻止心跳上报
    winSession.webRequest.onBeforeRequest(
      { urls: ["*://live-trace.bilibili.com/xlive/data-interface/v1/x25Kn/X*"] },
      (_, callback) => { callback({ redirectURL: "data:application/json,%7B%22code%22%3A0%7D" }); }
    );
  }

  if (window.__stealthRegistered) return;
  window.__stealthRegistered = true;

  const wc = window.webContents;

  // 预获取 token
  let cachedToken = null;
  wc.on("did-start-navigation", (_, url) => {
    if (!url.includes("live.bilibili.com")) return;
    const roomMatch = url.match(/\/(\d+)/);
    if (roomMatch) {
      getAnonDanmuToken(roomMatch[1], winSession).then((token) => {
        if (token) cachedToken = token;
      });
    }
  });

  // iframe 加载完成后注入 token + style
  wc.on("did-frame-finish-load", () => {
    if (!wc.getURL().includes("live.bilibili.com")) return;
    try {
      wc.mainFrame.framesInSubtree.forEach((frame) => {
        if (!frame.url.includes("live.bilibili.com")) return;

        frame.executeJavaScript(`
          if (!document.getElementById('__stealth-style')) {
            var s = document.createElement('style');
            s.id = '__stealth-style';
            s.textContent = '.privacy-dialog, .privacy-dialog-tip-text, .privacy-dialog-ctnr { display: none !important; }';
            (document.head || document.documentElement).appendChild(s);
          }
          if (typeof window.__GREAT_TOILET__ !== 'function' || !window.__GREAT_TOILET__.__stealth) {
            window.__GREAT_TOILET__ = function(t) {
              if (t.cmd === 'DANMU_MSG' && t.info && t.info[0]) {
                if (window.BilibiliLive && window.BilibiliLive.RND === t.info[0][5]) {
                  t.cmd = '__SELF_DANMU';
                }
              }
            };
            window.__GREAT_TOILET__.__stealth = true;
          }
          (function patchEngine() {
            var eng = window.LiveDanmakuEngine && window.LiveDanmakuEngine.default;
            if (!eng) { setTimeout(patchEngine, 500); return; }
            if (eng.__stealthPatched) return;
            eng.__stealthPatched = true;
            var origHandle = eng.prototype.handleSocketMessage;
            eng.prototype.handleSocketMessage = function(e, n) {
              if (e.cmd && e.cmd.startsWith('DANMU_MSG') && e.info && e.info[0]) {
                if (window.BilibiliLive && window.BilibiliLive.RND === e.info[0][5]) return;
              }
              return origHandle.call(this, e, n);
            };
          })();
        `).catch(() => {});

        const roomMatch = frame.url.match(/\/(\d+)/);
        if (!roomMatch) return;
        const roomId = roomMatch[1];

        function injectToken(token) {
          frame.executeJavaScript(
            `window.__bililoader_stealth_setToken && window.__bililoader_stealth_setToken(${JSON.stringify(token)})`
          ).catch(() => {});
        }

        if (cachedToken) {
          injectToken(cachedToken);
        } else {
          getAnonDanmuToken(roomId, winSession).then((token) => {
            if (token) { cachedToken = token; injectToken(token); }
          });
        }
      });
    } catch { }
  });

  // 入场请求 room_id 替换（CDP Fetch）
  wc.on("did-start-loading", () => {
    if (!wc.getURL().includes("live.bilibili.com")) return;
    try {
      const dbg = wc.debugger;
      if (!dbg.isAttached()) dbg.attach("1.3");
      dbg.sendCommand("Fetch.enable", {
        patterns: [{ urlPattern: "*getInfoByUser*not_mock_enter_effect*", requestStage: "Request" }],
      });
      dbg.on("message", (_, method, params) => {
        if (method !== "Fetch.requestPaused") return;
        const opts = { requestId: params.requestId };
        opts.url = params.request.url.replace(/room_id=\d+/, "room_id=" + FAKE_ROOM_ID);
        dbg.sendCommand("Fetch.continueRequest", opts).catch(() => { });
      });
    } catch { }
  });
};
