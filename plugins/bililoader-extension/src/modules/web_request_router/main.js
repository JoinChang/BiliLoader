// webRequest 路由器：Electron 每个 session 的 onBeforeRequest 只允许一个监听器，
// 多个模块直接注册会互相顶掉，这里统一注册并按规则分发。
// 注意：注册给 Electron 的 filter 是所有规则 pattern 的并集，
// 因此分发时必须按各规则自己的 pattern 匹配 URL，否则规则会收到别人的请求。
const rules = [];
const sessions = new Set();

function patternToRegExp(pattern) {
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

// 用当前全部规则的 pattern 并集重新安装监听器（onBeforeRequest 会替换已有监听器）
function install(session) {
  const urls = [...new Set(rules.flatMap((r) => r.patterns))];
  if (urls.length === 0) return;
  session.webRequest.onBeforeRequest({ urls }, (details, callback) => {
    for (const rule of rules) {
      if (!rule._regexps.some((re) => re.test(details.url))) continue;
      try {
        const response = rule.handler(details);
        if (response) return callback(response);
      } catch {}
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
  for (const session of sessions) install(session);
};

exports.register = (session) => {
  if (sessions.has(session)) return;
  sessions.add(session);
  install(session);
};
