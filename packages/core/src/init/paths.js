const path = require("path");
const os = require("os");

function getProfilePath() {
  if (process.env["BILILOADER_PROFILE"]) {
    return process.env["BILILOADER_PROFILE"];
  }
  return process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "BiliLoader")
    : path.join(os.homedir(), ".config", "BiliLoader");
}

module.exports = { getProfilePath };
