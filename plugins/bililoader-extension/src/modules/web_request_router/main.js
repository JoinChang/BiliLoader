// webRequest 路由器：Electron 每个 session 的 onBeforeRequest 只允许一个监听器。
// 客户端自己也会注册 onBeforeRequest，且时机可能晚于本路由器、把它顶掉。
// 因此这里接管 session.webRequest.onBeforeRequest：本路由器始终占据唯一监听位，
// 客户端后续的注册被记为「下游」监听器，由本路由器在规则未命中时链式调用。
const rules = [];
// session -> { real, downstream }：real 是原始 onBeforeRequest，downstream 是客户端注册的监听器
const sessions = new Map();

function patternToRegExp(pattern) {
  if (pattern === "<all_urls>") return /^/;
  const m = /^([^:]+):\/\/([^/]*)(\/.*)$/.exec(pattern);
  if (!m) return null;

  const esc = (s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const scheme = m[1] === "*" ? "https?" : esc(m[1]);

  let host;
  if (m[2] === "*") host = "[^/]*";
  else if (m[2].startsWith("*.")) host = "(?:[^/]*\\.)?" + esc(m[2].slice(2));
  else host = esc(m[2]);

  const path = esc(m[3]).replace(/\*/g, ".*");
  return new RegExp(`^${scheme}://${host}(?::\\d+)?${path}$`);
}

function dsUrls(downstream) {
  const urls = downstream && downstream.filter && downstream.filter.urls;
  return Array.isArray(urls) && urls.length ? urls : ["<all_urls>"];
}

// 用「规则 pattern ∪ 下游 filter」的并集重装监听器，规则未命中时交给下游
function install(session) {
  const state = sessions.get(session);
  if (!state) return;
  const ds = state.downstream;
  const urls = [...new Set([...rules.flatMap((r) => r.patterns), ...(ds ? dsUrls(ds) : [])])];
  if (urls.length === 0) return;

  state.real({ urls }, (details, callback) => {
    for (const rule of rules) {
      if (!rule._regexps.some((re) => re.test(details.url))) continue;
      try {
        const response = rule.handler(details);
        if (response) return callback(response);
      } catch {}
    }
    // 规则未命中：若匹配下游 filter，交给客户端自己的监听器，否则放行
    if (ds && ds._regexps.some((re) => re.test(details.url))) {
      try { return ds.listener(details, callback); } catch {}
    }
    callback({});
  });
}

// rule: { patterns: string[], handler: (details) => response | undefined }
// handler 返回 { redirectURL } 等响应对象表示接管，返回 undefined 则放行给下一条规则
exports.addRule = (rule) => {
  rule._regexps = rule.patterns.map(patternToRegExp).filter(Boolean);
  rules.push(rule);
  // 规则可能晚于 register 加入，已注册的 session 需按新并集重装
  for (const session of sessions.keys()) install(session);
};

exports.register = (session) => {
  if (sessions.has(session)) return;

  const wr = session.webRequest;
  const real = wr.onBeforeRequest.bind(wr);
  sessions.set(session, { real, downstream: null });

  // 接管 onBeforeRequest：客户端之后的注册记为下游并重装，不再顶掉本路由器
  wr.onBeforeRequest = (filter, listener) => {
    const state = sessions.get(session);
    state.downstream = listener
      ? { filter, listener, _regexps: dsUrls({ filter }).map(patternToRegExp).filter(Boolean) }
      : null;
    install(session);
  };

  install(session);
};
