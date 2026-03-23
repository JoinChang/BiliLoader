// 直播间隐身 preload — hook 弹幕 WS 认证，uid 改为 0
// 需要 nodeIntegrationInSubFrames: true 才能在 iframe 中运行
const { webFrame } = require("electron");

webFrame.executeJavaScript(`(function() {
  if (window.__bwsh) return;
  window.__bwsh = 1;
  var O = WebSocket, H = ['broadcastlv.chat.bilibili.com', 'live-comet'];
  window.WebSocket = function(u, p) {
    var w = p ? new O(u, p) : new O(u);
    if (typeof u !== 'string' || !H.some(function(h) { return u.indexOf(h) >= 0 })) return w;
    var s = w.send.bind(w), d = 0;
    w.send = function(a) {
      if (!d) {
        var b = a instanceof ArrayBuffer ? new Uint8Array(a) : a instanceof Uint8Array ? a : null;
        if (b && b.length > 16 && ((b[8]<<24|b[9]<<16|b[10]<<8|b[11]) === 7)) {
          d = 1;
          var h = b[4]<<8|b[5];
          try {
            var j = JSON.parse(new TextDecoder().decode(b.slice(h)));
            j.uid = 0;
            var n = new TextEncoder().encode(JSON.stringify(j));
            var p = new Uint8Array(h + n.length);
            p.set(b.slice(0, h)); p.set(n, h);
            p[0]=p.length>>>24&255; p[1]=p.length>>>16&255; p[2]=p.length>>>8&255; p[3]=p.length&255;
            return s(p.buffer);
          } catch(e) {}
        }
      }
      return s(a);
    };
    return w;
  };
  WebSocket.prototype = O.prototype;
  WebSocket.CONNECTING = O.CONNECTING;
  WebSocket.OPEN = O.OPEN;
  WebSocket.CLOSING = O.CLOSING;
  WebSocket.CLOSED = O.CLOSED;
})()`).catch(() => {});
