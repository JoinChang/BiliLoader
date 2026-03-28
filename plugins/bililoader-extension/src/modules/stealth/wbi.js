const https = require("https");
const crypto = require("crypto");

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

let _wbiKeys = null;
let _wbiKeysTs = 0;

async function getWbiKeys() {
  if (_wbiKeys && Date.now() - _wbiKeysTs < 30 * 60 * 1000) return _wbiKeys;
  return new Promise((resolve) => {
    https.get("https://api.bilibili.com/x/web-interface/nav", {
      headers: { "User-Agent": "Mozilla/5.0" },
    }, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try {
          const nav = JSON.parse(data);
          _wbiKeys = {
            imgKey: nav.data?.wbi_img?.img_url?.split("/").pop().split(".")[0],
            subKey: nav.data?.wbi_img?.sub_url?.split("/").pop().split(".")[0],
          };
          _wbiKeysTs = Date.now();
          resolve(_wbiKeys);
        } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function signWbi(params, imgKey, subKey) {
  const mixinKey = MIXIN_KEY_ENC_TAB.map((n) => (imgKey + subKey)[n]).join("").substring(0, 32);
  params.wts = String(Math.floor(Date.now() / 1000));
  const query = Object.keys(params).sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`).join("&");
  const w_rid = crypto.createHash("md5").update(query + mixinKey).digest("hex");
  return query + "&w_rid=" + w_rid;
}

module.exports = { getWbiKeys, signWbi };
