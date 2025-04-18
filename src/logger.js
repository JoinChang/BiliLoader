const log = require("electron-log");

const logBuffer = [];

function getLogs() {
    return [...logBuffer];
}

function clearLogs() {
    logBuffer.length = 0;
}

// 导出日志函数
module.exports = {
    log: (...args) => {
        const message = args.map(String).join(" ");
        log.info(message);
        logBuffer.push(args);
    },
    getLogs,
    clearLogs
};
