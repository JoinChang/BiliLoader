const path = require("path");
const https = require("https");
const crypto = require("crypto");

const FAKE_ROOM_ID = "273022";
const STEALTH_PRELOAD = path.join(__dirname, "preload.js");

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

let _wbiKeys = null;
let _wbiKeysTs = 0;

async function getWbiKeys() {
  if (_wbiKeys && Date.now() - _wbiKeysTs < 30 * 60 * 1000) return _wbiKeys;
  return new Promise((resolve) => {
    https.get("https://api.bilibili.com/x/web-interface/nav", {
      headers: { "User-Agent": "Mozilla/5.0" },
    }, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try {
          const nav = JSON.parse(data);
          _wbiKeys = {
            imgKey: nav.data?.wbi_img?.img_url?.split("/").pop().split(".")[0],
            subKey: nav.data?.wbi_img?.sub_url?.split("/").pop().split(".")[0],
          };
          _wbiKeysTs = Date.now();
          resolve(_wbiKeys);
        } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function signWbi(params, imgKey, subKey) {
  const mixinKey = MIXIN_KEY_ENC_TAB.map((n) => (imgKey + subKey)[n]).join("").substring(0, 32);
  params.wts = String(Math.floor(Date.now() / 1000));
  const query = Object.keys(params).sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`).join("&");
  const w_rid = crypto.createHash("md5").update(query + mixinKey).digest("hex");
  return query + "&w_rid=" + w_rid;
}

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

    // preload 注入（在页面 JS 执行前 hook WebSocket）
    try {
      const existing = winSession.getPreloads ? winSession.getPreloads() : [];
      if (!existing.includes(STEALTH_PRELOAD)) {
        winSession.setPreloads([...existing, STEALTH_PRELOAD]);
      }
    } catch { }
  }

  if (window.__stealthRegistered) return;
  window.__stealthRegistered = true;

  const wc = window.webContents;

  // 预获取 token（在 iframe 加载前就准备好，减少延迟）
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
          // 隐藏隐私提示
          if (!document.getElementById('__stealth-style')) {
            var s = document.createElement('style');
            s.id = '__stealth-style';
            s.textContent = '.privacy-dialog, .privacy-dialog-tip-text, .privacy-dialog-ctnr { display: none !important; }';
            (document.head || document.documentElement).appendChild(s);
          }
          // 自己发的弹幕去重
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
          // 画面弹幕去重
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

        // 注入匿名 token
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
