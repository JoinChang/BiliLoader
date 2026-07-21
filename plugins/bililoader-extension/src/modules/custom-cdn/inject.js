// 点播 / 番剧 / 课堂 CDN 线路：改写 playurl 接口响应里的媒体 host，播放器直接向新节点请求
// （不用 webRequest 重定向：DASH 分片是 CORS fetch，跨域重定向会被浏览器拦截）
(function () {
  if (window.__bililoader_customCdn) return;
  window.__bililoader_customCdn = true;

  var PLUGIN_ID = 'bililoader-extension';
  // 视频(UGC) / 番剧影视(PGC) / 课堂(PUGV) / OGV 的 playurl 接口
  var PLAYURL_PATHS = [
    '/x/player/wbi/playurl', '/x/player/playurl',
    '/pgc/player/web/playurl', '/pgc/player/web/v2/playurl', '/pgc/player/api/playurl',
    '/pugv/player/web/playurl', '/ogv/player/playview',
  ];

  var MEDIA_RE = /(?:bilivideo|acgvideo)\.(?:com|cn)|edge\.mountaintoys\.cn|akamaized\.net/;
  var IGNORE_HOST_RE = /^(?:bvc|data|pbp|api)/;

  function targetHost() {
    var c = (window.__bililoader_pluginConfig__ && window.__bililoader_pluginConfig__[PLUGIN_ID]) || {};
    return c['custom-cdn-video'] || '';
  }

  function replaceHost(url, host) {
    if (typeof url !== 'string' || !MEDIA_RE.test(url)) return url;
    var m = url.match(/^(https?:)?\/\/([^/]+)/);
    if (!m || IGNORE_HOST_RE.test(m[2])) return url;
    return url.replace(/^((?:https?:)?\/\/)[^/]+/, '$1' + host);
  }

  // 递归改写响应里所有媒体主地址（兼容 UGC 的 data.dash 与 PGC 的 result.video_info.dash 等不同结构）。
  // backup_url / backupUrl 保留原值，并把原主地址塞进备用列表首位——
  // 点播是分发存储，选中节点未必有该文件（404），有回退才不至于卡死。
  function rewriteDeep(node, host) {
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        if (typeof node[i] === 'string') node[i] = replaceHost(node[i], host);
        else rewriteDeep(node[i], host);
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (var k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      if (k === 'backup_url' || k === 'backupUrl') continue; // 保留备用地址作回退
      var v = node[k];
      if (typeof v === 'string') {
        var t = replaceHost(v, host);
        if (t === v) continue;
        node[k] = t;
        var bk = k === 'baseUrl' ? 'backupUrl' : (k === 'base_url' || k === 'url') ? 'backup_url' : null;
        if (bk) node[bk] = Array.isArray(node[bk]) ? [v].concat(node[bk]) : [v];
      } else {
        rewriteDeep(v, host);
      }
    }
  }

  function rewrite(json) {
    var host = targetHost();
    if (!host || !json || typeof json !== 'object') return json;
    if (json.code !== undefined && json.code !== 0) return json; // 跳过错误响应
    rewriteDeep(json, host);
    return json;
  }

  function rewriteText(text) {
    try { return JSON.stringify(rewrite(JSON.parse(text))); }
    catch (e) { return text; }
  }

  function isPlayurl(url) {
    return typeof url === 'string' && !!targetHost() && PLAYURL_PATHS.some(function (p) { return url.indexOf(p) >= 0; });
  }

  var textDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
  var respDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__blPlayurl = isPlayurl(url);
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    if (this.__blPlayurl) {
      var xhr = this;
      var cache = null;
      var mod = function (orig) {
        if (cache === null) cache = rewriteText(orig);
        return cache;
      };
      Object.defineProperty(xhr, 'responseText', {
        configurable: true,
        get: function () {
          var orig = textDesc.get.call(xhr);
          return xhr.readyState === 4 ? mod(orig) : orig;
        },
      });
      Object.defineProperty(xhr, 'response', {
        configurable: true,
        get: function () {
          var orig = respDesc.get.call(xhr);
          if (xhr.readyState !== 4) return orig;
          if (xhr.responseType === 'json') return rewrite(orig);
          if (xhr.responseType === '' || xhr.responseType === 'text') return mod(orig);
          return orig;
        },
      });
    }
    return origSend.apply(this, arguments);
  };

  var origFetch = window.fetch;
  window.fetch = function (input) {
    var url = typeof input === 'string' ? input : (input && input.url);
    var result = origFetch.apply(this, arguments);
    if (!isPlayurl(url)) return result;
    return result.then(function (resp) {
      return resp.clone().text().then(function (text) {
        return new Response(rewriteText(text), {
          status: resp.status,
          statusText: resp.statusText,
          headers: resp.headers,
        });
      }).catch(function () { return resp; });
    });
  };
})();
