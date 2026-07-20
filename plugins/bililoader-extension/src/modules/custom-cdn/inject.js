// 点播 CDN 线路
(function () {
  if (window.__bililoader_customCdn) return;
  window.__bililoader_customCdn = true;

  var PLUGIN_ID = 'bililoader-extension';
  var PLAYURL_API = '/x/player/wbi/playurl';

  function targetHost() {
    var c = (window.__bililoader_pluginConfig__ && window.__bililoader_pluginConfig__[PLUGIN_ID]) || {};
    return c['custom-cdn-video'] || '';
  }

  function replaceHost(url, host) {
    if (typeof url !== 'string') return url;
    return url.replace(/^(https?:)\/\/[^/]+/, '$1//' + host);
  }

  // 滤掉 PCDN 等非直连形态，其余换成目标 host
  function fixBackup(list, host) {
    if (!Array.isArray(list)) return list;
    return list
      .filter(function (u) { return /:\/\/[^/]*bilivideo\.(com|cn)\//.test(u); })
      .map(function (u) { return replaceHost(u, host); });
  }

  function fixStreams(arr, host) {
    if (!Array.isArray(arr)) return;
    arr.forEach(function (item) {
      if (!item) return;
      if (item.baseUrl) item.baseUrl = replaceHost(item.baseUrl, host);
      if (item.base_url) item.base_url = replaceHost(item.base_url, host);
      item.backupUrl = fixBackup(item.backupUrl, host);
      item.backup_url = fixBackup(item.backup_url, host);
    });
  }

  function rewrite(json) {
    var host = targetHost();
    if (!host) return json;
    var data = json && json.data;
    if (!data) return json;

    if (data.dash) {
      fixStreams(data.dash.video, host);
      fixStreams(data.dash.audio, host);
      if (data.dash.dolby && data.dash.dolby.audio) fixStreams(data.dash.dolby.audio, host);
      if (data.dash.flac && data.dash.flac.audio) fixStreams([data.dash.flac.audio], host);
    }
    if (Array.isArray(data.durl)) {
      data.durl.forEach(function (d) {
        if (d.url) d.url = replaceHost(d.url, host);
        d.backup_url = fixBackup(d.backup_url, host);
      });
    }
    return json;
  }

  function rewriteText(text) {
    try { return JSON.stringify(rewrite(JSON.parse(text))); }
    catch (e) { return text; }
  }

  function isPlayurl(url) {
    return typeof url === 'string' && url.indexOf(PLAYURL_API) >= 0 && !!targetHost();
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
