const rules = [];

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

exports.addRule = (rule) => {
  rule._regexps = rule.patterns.map(patternToRegExp).filter(Boolean);
  rules.push(rule);
};

exports.register = (session) => {
  if (session.__blWebRequestRouted) return;
  session.__blWebRequestRouted = true;

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
};
