(function () {
  if (window.__bililoader_stealth) return;

  // 检查配置是否启用
  var pluginConfig = (window.__bililoader_pluginConfig__ && window.__bililoader_pluginConfig__["bililoader-extension"]) || {};
  if (!pluginConfig["stealth-live"]) return;

  window.__bililoader_stealth = true;

  // 用户缓存
  var userCache = {};

  function makeFingerprint(firstChar, medalName, medalLevel, userLevel, guardLevel) {
    return (firstChar || '') + '|' + (medalName || '') + '|' + medalLevel + '|' + userLevel + '|' + guardLevel;
  }

  function lookupCache(firstChar, medalName, medalLevel) {
    var keys = Object.keys(userCache);
    for (var i = 0; i < keys.length; i++) {
      var p = keys[i].split('|');
      if (p[0] === firstChar && p[1] === medalName && p[2] === String(medalLevel)) {
        return userCache[keys[i]];
      }
    }
    return null;
  }

  // 待替换队列
  var pendingQueue = [];

  function tryReplace(item) {
    var dm = lookupCache(item.firstChar, item.medalName, item.medalLevel);
    if (!dm) return false;
    var nameEl = item.el.querySelector('.user-name');
    if (nameEl) nameEl.textContent = nameEl.textContent.replace(/[^\s：:]*\*{3}[^\s：:]*/, dm.nickname);
    if (dm.uid) item.el.dataset.uid = dm.uid;
    item.el.dataset.uname = dm.nickname;
    return true;
  }

  function flushPending() {
    pendingQueue = pendingQueue.filter(function (item) {
      if (Date.now() - item.ts > 60000) return false;
      if (!item.el.parentElement) return false;
      return !tryReplace(item);
    });
  }

  // 提取弹幕信息
  function extractInfo(node) {
    var nameEl = node.querySelector('.user-name');
    if (!nameEl) return null;
    var uname = nameEl.textContent.replace(/[\s：:]+$/, '');
    if (uname.indexOf('***') < 0) return null;

    var firstChar = uname.replace(/\*+.*$/, '').charAt(0);
    var medalEl = node.querySelector('.fans-medal-item-ctnr');
    var medalText = medalEl ? medalEl.textContent.trim() : '';
    var medalName = '', medalLevel = 0;
    if (medalText) {
      var mp = medalText.match(/^(.+?)\s*(\d+)\s*$/);
      if (mp) { medalName = mp[1]; medalLevel = parseInt(mp[2]); }
    }
    return { el: node, firstChar: firstChar, medalName: medalName, medalLevel: medalLevel, ts: Date.now() };
  }

  function startObserver() {
    var chatItems = document.getElementById('chat-items');
    if (!chatItems) { setTimeout(startObserver, 500); return; }

    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1 || !node.classList || !node.classList.contains('danmaku-item')) return;

          // 去重：遮罩弹幕如果已有同内容非遮罩版则删除（只查最近 50 条）
          var nameEl = node.querySelector('.user-name');
          if (nameEl && nameEl.textContent.indexOf('***') >= 0) {
            var content = node.dataset.danmaku || '';
            var children = chatItems.children;
            var start = Math.max(0, children.length - 50);
            for (var i = children.length - 1; i >= start; i--) {
              var sib = children[i];
              if (sib !== node && sib.dataset.danmaku === content) {
                var sibName = sib.querySelector('.user-name')?.textContent || '';
                if (sibName.indexOf('***') < 0) { node.remove(); return; }
              }
            }
          }

          // 替换遮罩用户名
          var item = extractInfo(node);
          if (!item) return;
          if (!tryReplace(item)) {
            if (pendingQueue.length < 200) pendingQueue.push(item);
          }
        });
      });
    }).observe(chatItems, { childList: true });
  }
  setTimeout(startObserver, 500);

  // 匿名 WS 连接
  var OrigWS = WebSocket;
  var DANMU_HOSTS = ['broadcastlv.chat.bilibili.com', 'live-comet'];
  var ANON_TOKEN = null;
  var tokenWaiters = [];

  window.__bililoader_stealth_setToken = function (token) {
    ANON_TOKEN = token;
    tokenWaiters.forEach(function (cb) { cb(token); });
    tokenWaiters = [];
  };

  function isDanmuHost(url) {
    return typeof url === 'string' && DANMU_HOSTS.some(function (h) { return url.indexOf(h) >= 0; });
  }

  function StealthWS(url, protocols) {
    var ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
    if (!isDanmuHost(url)) return ws;

    var origSend = ws.send.bind(ws);
    var authSent = false;
    var buffered = [];
    var ready = false;

    ws.send = function (data) {
      if (!authSent) {
        var buf = data instanceof ArrayBuffer ? new Uint8Array(data)
          : data instanceof Uint8Array ? data : null;
        if (buf && buf.length > 16 && ((buf[8] << 24 | buf[9] << 16 | buf[10] << 8 | buf[11]) === 7)) {
          authSent = true;
          var headerLen = buf[4] << 8 | buf[5];
          try {
            var body = JSON.parse(new TextDecoder().decode(buf.slice(headerLen)));
            var doSend = function (token) {
              body.uid = 0;
              body.key = token;
              var encoded = new TextEncoder().encode(JSON.stringify(body));
              var pkt = new Uint8Array(headerLen + encoded.length);
              pkt.set(buf.slice(0, headerLen));
              pkt.set(encoded, headerLen);
              pkt[0] = pkt.length >>> 24 & 0xFF;
              pkt[1] = pkt.length >>> 16 & 0xFF;
              pkt[2] = pkt.length >>> 8 & 0xFF;
              pkt[3] = pkt.length & 0xFF;
              origSend(pkt.buffer);
              ready = true;
              buffered.forEach(function (d) { origSend(d); });
              buffered = [];
            };
            if (ANON_TOKEN !== null) doSend(ANON_TOKEN);
            else tokenWaiters.push(doSend);
            return;
          } catch { }
        }
      }
      if (authSent && !ready) { buffered.push(data); return; }
      return origSend(data);
    };
    return ws;
  }

  StealthWS.prototype = OrigWS.prototype;
  StealthWS.CONNECTING = OrigWS.CONNECTING;
  StealthWS.OPEN = OrigWS.OPEN;
  StealthWS.CLOSING = OrigWS.CLOSING;
  StealthWS.CLOSED = OrigWS.CLOSED;
  Object.defineProperty(StealthWS, 'name', { value: 'WebSocket' });
  window.WebSocket = StealthWS;

  // 拦截进场上报
  var origFetch = window.fetch;
  window.fetch = function (url) {
    if (typeof url === 'string' && (
      url.indexOf('room_entry_action') >= 0 || url.indexOf('roomEntryAction') >= 0
    )) return Promise.resolve(new Response('{"code":0}', { status: 200 }));
    return origFetch.apply(this, arguments);
  };

  // 轮询 gethistory API 填充用户缓存
  (function () {
    var roomId = null;

    function extractRoomId() {
      var m = location.href.match(/\/(\d+)/);
      return m ? m[1] : null;
    }

    function poll() {
      if (!roomId) roomId = extractRoomId();
      if (!roomId) return;

      origFetch('https://api.live.bilibili.com/xlive/web-room/v1/dM/gethistory?roomid=' + roomId, {
        credentials: 'include',
      }).then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.code !== 0 || !data.data || !data.data.room) return;
          data.data.room.forEach(function (dm) {
            if (!dm.nickname) return;
            userCache[makeFingerprint(
              dm.nickname.charAt(0),
              dm.medal && dm.medal[1] ? dm.medal[1] : '',
              dm.medal && dm.medal[0] ? dm.medal[0] : 0,
              dm.user_level && dm.user_level[0] ? dm.user_level[0] : 0,
              dm.guard_level || 0
            )] = { nickname: dm.nickname, uid: dm.uid };
          });
          flushPending();
        }).catch(function () { });
    }

    setTimeout(function loop() { poll(); setTimeout(loop, 1000); }, 200);
  })();
})()
