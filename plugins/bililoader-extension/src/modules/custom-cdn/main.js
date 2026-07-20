// 直播 CDN 线路
const router = require("../web_request_router/main.js");

const MEDIA_PATTERNS = [
  "*://*.bilivideo.com/*",
  "*://*.bilivideo.cn/*",
];

let ruleAdded = false;

exports.register = (readConfig) => {
  if (ruleAdded) return;
  ruleAdded = true;

  router.addRule({
    patterns: MEDIA_PATTERNS,
    handler: (details) => {
      const url = new URL(details.url);
      if (!url.pathname.includes("/live-bvc/")) return;

      const target = readConfig()["custom-cdn-live"];
      if (!target || url.hostname === target) return;

      url.protocol = "https:";
      url.hostname = target;
      url.port = "";
      return { redirectURL: url.toString() };
    },
  });
};
