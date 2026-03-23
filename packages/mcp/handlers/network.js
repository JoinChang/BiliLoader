// 网络请求日志、响应详情、请求拦截
const { text } = require("./utils.js");

async function handleGetNetworkLog(cdp, { filter, type, limit = 50 }) {
  let logs = [...cdp.networkLog];
  if (filter) {
    const keyword = filter.toLowerCase();
    logs = logs.filter(e => e.url.toLowerCase().includes(keyword));
  }
  if (type) {
    const t = type.toLowerCase();
    logs = logs.filter(e => (e.type || "").toLowerCase() === t);
  }
  logs = logs.slice(-limit).map(e => {
    const entry = { requestId: e.requestId, method: e.method, url: e.url, type: e.type, status: e.status, mimeType: e.mimeType };
    if (e.postData) entry.postData = e.postData;
    return entry;
  });
  return text(JSON.stringify(logs, null, 2));
}

async function handleGetRequestDetail(cdp, { requestId }) {
  const result = await cdp.send("Network.getResponseBody", { requestId });
  return text(result.base64Encoded ? `[Base64 编码内容，长度: ${result.body.length}]` : result.body);
}

// 请求拦截状态
let fetchInterceptState = { enabled: false, blockPatterns: [], modifyRules: [], intercepted: [] };

async function handleInterceptRequests(cdp, { action, patterns, blockPatterns, modifyRules }) {
  if (action === "disable") {
    await cdp.send("Fetch.disable");
    cdp._fetchHandler = null;
    const summary = fetchInterceptState.intercepted;
    fetchInterceptState = { enabled: false, blockPatterns: [], modifyRules: [], intercepted: [] };
    return text(`已停止拦截。共记录 ${summary.length} 个请求:\n` +
      summary.map(r => `[${r.action}] ${r.method} ${r.url}${r.postData ? " body:" + r.postData.substring(0, 100) : ""}`).join("\n"));
  }

  if (action === "enable") {
    fetchInterceptState = {
      enabled: true,
      blockPatterns: blockPatterns || [],
      modifyRules: modifyRules || [],
      intercepted: [],
    };

    await cdp.send("Fetch.enable", {
      patterns: (patterns || ["*"]).map(p => ({ urlPattern: p, requestStage: "Request" })),
    });

    cdp._fetchHandler = (method, params) => {
      if (method !== "Fetch.requestPaused") return;
      const url = params.request.url;
      const shortUrl = url.split("?")[0];

      if (fetchInterceptState.blockPatterns.some(p => url.includes(p))) {
        fetchInterceptState.intercepted.push({ action: "BLOCK", method: params.request.method, url: shortUrl });
        cdp.send("Fetch.failRequest", { requestId: params.requestId, errorReason: "BlockedByClient" }).catch(() => {});
        return;
      }

      let newUrl = url;
      for (const rule of fetchInterceptState.modifyRules) {
        if (url.includes(rule.match)) newUrl = url.replace(new RegExp(rule.replace, "g"), rule.with);
      }
      if (newUrl !== url) {
        fetchInterceptState.intercepted.push({ action: "MODIFY", method: params.request.method, url: shortUrl });
        cdp.send("Fetch.continueRequest", { requestId: params.requestId, url: newUrl }).catch(() => {});
        return;
      }

      fetchInterceptState.intercepted.push({ action: "PASS", method: params.request.method, url: shortUrl, postData: params.request.postData });
      cdp.send("Fetch.continueRequest", { requestId: params.requestId }).catch(() => {});
    };

    return text(`拦截已启用。模式: ${(patterns || ["*"]).join(", ")}\n阻止: ${(blockPatterns || []).join(", ") || "无"}\n修改: ${(modifyRules || []).map(r => r.match).join(", ") || "无"}`);
  }

  throw new Error("action 必须是 enable 或 disable");
}

module.exports = { handleGetNetworkLog, handleGetRequestDetail, handleInterceptRequests };
