(function () {
  if (window.__bililoader_feedFilter) return;
  window.__bililoader_feedFilter = true;

  var PLUGIN_ID = 'bililoader-extension';
  var FEED_API = 'top/feed/rcmd';
  var origFetch = window.fetch;

  function cfg() {
    return (window.__bililoader_pluginConfig__ && window.__bililoader_pluginConfig__[PLUGIN_ID]) || {};
  }

  window.fetch = function (url) {
    var result = origFetch.apply(this, arguments);
    if (typeof url !== 'string' || url.indexOf(FEED_API) < 0) return result;

    var c = cfg();
    var hasAnyFilter = c["filter-ad"] || c["filter-rocket-ad"] ||
      (c["filter-title"] && c["filter-title"].length > 0) ||
      (c["filter-reason"] && c["filter-reason"].length > 0) ||
      (c["filter-uid"] && c["filter-uid"].length > 0) ||
      (c["filter-upname"] && c["filter-upname"].length > 0);

    if (!hasAnyFilter) return result;

    return result.then(function (resp) {
      var clone = resp.clone();
      return clone.json().then(function (data) {
        if (data.data && data.data.item) {
          data.data.item = data.data.item.filter(function (item) {
            if (item.goto === 'ad' && item.business_info) {
              var isPromotedVideo = !!(item.business_info.archive && item.business_info.archive.aid);
              if (isPromotedVideo && c["filter-rocket-ad"]) return false;
              if (!isPromotedVideo && c["filter-ad"]) return false;
            }
            if (item.goto !== 'ad') {
              if (matchList(item.title, c["filter-title"], c["filter-title-regex"])) return false;
              if (matchList(item.rcmd_reason && item.rcmd_reason.content, c["filter-reason"], c["filter-reason-regex"])) return false;
              if (c["filter-uid"] && c["filter-uid"].length > 0 && item.owner && c["filter-uid"].indexOf(String(item.owner.mid)) >= 0) return false;
              if (matchList(item.owner && item.owner.name, c["filter-upname"], c["filter-upname-regex"])) return false;
            }
            return true;
          });
        }
        return new Response(JSON.stringify(data), {
          status: resp.status,
          statusText: resp.statusText,
          headers: resp.headers,
        });
      }).catch(function () { return resp; });
    });
  };

  var regexCache = {};

  function getRegex(pattern) {
    if (!regexCache[pattern]) {
      try { regexCache[pattern] = new RegExp(pattern, 'i'); } catch (e) { regexCache[pattern] = null; }
    }
    return regexCache[pattern];
  }

  function matchList(text, list, useRegex) {
    if (!text || !list || list.length === 0) return false;
    for (var i = 0; i < list.length; i++) {
      if (useRegex) {
        var re = getRegex(list[i]);
        if (re && re.test(text)) return true;
      } else {
        if (text.indexOf(list[i]) >= 0) return true;
      }
    }
    return false;
  }
})();
