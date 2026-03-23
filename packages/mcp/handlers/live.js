// 直播弹幕连接与获取
const { text, evaluate } = require("./utils.js");

async function handleConnectLiveDanmaku(cdp, danmaku, { roomId }) {
  if (!roomId) {
    try {
      roomId = await evaluate(cdp, `(() => {
        const iframe = document.querySelector('iframe');
        if (iframe) { const m = iframe.src.match(/\\/(\\d+)/); if (m) return parseInt(m[1]); }
        const m = location.href.match(/\\/(\\d+)/); return m ? parseInt(m[1]) : null;
      })()`);
    } catch (e) {}
  }
  if (!roomId) throw new Error("无法获取直播间 ID，请传入 roomId 或先连接到直播间页面");

  let uid = 0, buvid = "", key = "", host = "", wssPort = 0;
  try {
    const info = await evaluate(cdp, `(() => {
      const iframe = document.querySelector('iframe');
      const win = iframe ? iframe.contentWindow : window;
      const doc = iframe ? iframe.contentDocument : document;
      const cookies = doc.cookie;
      const uid = (cookies.match(/DedeUserID=(\\d+)/) || [])[1] || '0';
      const buvid = (cookies.match(/buvid3=([^;]+)/) || [])[1] || '';
      const entry = win.performance.getEntries().find(e => e.name.includes('getDanmuInfo'));
      if (!entry) return { uid, buvid, error: 'no getDanmuInfo entry' };
      return new Promise((resolve) => {
        const xhr = new win.XMLHttpRequest();
        xhr.open('GET', entry.name, true);
        xhr.withCredentials = true;
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.code === 0) {
              const h = data.data.host_list?.[0];
              resolve({ uid, buvid, token: data.data.token, host: h?.host || '', wssPort: h?.wss_port || 0 });
            } else resolve({ uid, buvid, error: 'code=' + data.code });
          } catch(e) { resolve({ uid, buvid, error: e.message }); }
        };
        xhr.onerror = () => resolve({ uid, buvid, error: 'xhr failed' });
        xhr.send();
      });
    })()`, { awaitPromise: true });
    uid = parseInt(info.uid) || 0;
    buvid = info.buvid || "";
    key = info.token || "";
    host = info.host || "";
    wssPort = info.wssPort || 0;
  } catch (e) {}

  await danmaku.connect(roomId, { uid, key, buvid, host, wssPort });
  return text(`已连接到直播间 ${roomId} 的弹幕服务器 (${key ? "已认证" : "匿名"}, uid=${uid})`);
}

async function handleGetLiveDanmaku(danmaku, { limit = 20, type, clear = false }) {
  if (!danmaku.connected) throw new Error("未连接弹幕服务器，请先调用 connect_live_danmaku");
  let messages = danmaku.getMessages(limit);
  if (type) messages = messages.filter(m => m.type === type).slice(-limit);
  if (clear) danmaku.clearMessages();
  if (messages.length === 0) return text(`暂无${type ? ` ${type} 类型的` : ""}弹幕消息（房间 ${danmaku.roomId}，缓冲区共 ${danmaku.messages.length} 条）`);
  return text(JSON.stringify(messages, null, 2));
}

module.exports = { handleConnectLiveDanmaku, handleGetLiveDanmaku };
