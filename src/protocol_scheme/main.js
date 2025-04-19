const { app, protocol, net } = require("electron");
const path = require("path");

app.on("ready", () => {
    const schemes = ["local"];
    const old_schemes = app.commandLine.getSwitchValue("fetch-schemes");
    const new_schemes = [old_schemes, ...schemes].join(",");
    app.commandLine.appendSwitch("fetch-schemes", new_schemes);
});

protocol.registerSchemesAsPrivileged([
    {
        scheme: "local",
        privileges: {
            standard: false,
            allowServiceWorkers: true,
            corsEnabled: false,
            supportFetchAPI: true,
            stream: true,
            bypassCSP: true
        }
    }
]);

exports.protocolRegister = (protocol) => {
    const intercepted = protocol.isProtocolIntercepted("local");

    if (!intercepted) {
        protocol.interceptFileProtocol("local", (req, callback) => {
            const { host, pathname } = new URL(decodeURI(req.url));
            const filepath = path.normalize(pathname.slice(1));

            let fullPath;
            switch (host) {
                case "root":
                    fullPath = path.join(BiliLoader.path.root, filepath);
                    break;
                case "profile":
                    fullPath = path.join(BiliLoader.path.profile, filepath);
                    break;
                default:
                    fullPath = path.join(host, filepath);
                    break;
            }

            callback({ path: fullPath });
        });
    }
};
