const http = require("http");

class CDPClient {
  constructor(port = 9222) {
    this.port = port;
    this.ws = null;
    this.messageId = 0;
    this.pendingMessages = new Map();
    this.networkLog = [];
    this.maxNetworkLogSize = 500;
    this.lastTargetId = null;
  }

  /**
   * 获取可调试的页面列表
   */
  listTargets() {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${this.port}/json`, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`解析目标列表失败: ${e.message}`));
          }
        });
      });
      req.on("error", (e) => reject(new Error(`无法连接到调试端口 ${this.port}: ${e.message}`)));
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error("连接超时"));
      });
    });
  }

  /**
   * 连接到指定页面的 WebSocket 调试端口
   */
  async connect(targetId) {
    const targets = await this.listTargets();
    const target = targetId
      ? targets.find(t => t.id === targetId)
      : targets.find(t => t.type === "page");

    if (!target) {
      throw new Error("未找到可调试的页面");
    }

    // 关闭旧连接但保留 lastTargetId
    this._closeWs();
    this.lastTargetId = target.id;

    return new Promise((resolve, reject) => {
      const WebSocket = require("ws");
      this.ws = new WebSocket(target.webSocketDebuggerUrl);

      this.ws.on("open", async () => {
        try {
          await this.send("Network.enable");
        } catch (e) {
          // 非关键错误
        }
        resolve(target);
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.id !== undefined) {
            const pending = this.pendingMessages.get(message.id);
            if (pending) {
              this.pendingMessages.delete(message.id);
              if (message.error) {
                pending.reject(new Error(message.error.message));
              } else {
                pending.resolve(message.result);
              }
            }
          } else if (message.method) {
            this._handleEvent(message.method, message.params);
          }
        } catch (e) {
          // 解析错误忽略
        }
      });

      this.ws.on("error", (e) => reject(new Error(`WebSocket 连接失败: ${e.message}`)));
      this.ws.on("close", () => {
        this.ws = null;
        // 不清除 lastTargetId，让 send() 可以自动重连
        this.pendingMessages.forEach(p => p.reject(new Error("连接已断开")));
        this.pendingMessages.clear();
      });
    });
  }

  /**
   * 关闭 WebSocket 连接（内部使用，不清除 lastTargetId）
   */
  _closeWs() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.pendingMessages.clear();
  }

  /**
   * 断开连接（显式调用，清除一切状态）
   */
  disconnect() {
    this._closeWs();
    this.lastTargetId = null;
  }

  /**
   * 发送 CDP 命令，断线时自动重连上次的目标
   */
  async send(method, params = {}) {
    if (!this.ws && this.lastTargetId) {
      await this.connect(this.lastTargetId);
    }
    if (!this.ws) {
      throw new Error("未连接到调试目标，请先调用 connect_page");
    }

    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (e) {
        this.pendingMessages.delete(id);
        reject(new Error(`发送失败: ${e.message}`));
        return;
      }

      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`CDP 命令超时: ${method}`));
        }
      }, 30000);
    });
  }

  _handleEvent(method, params) {
    // Fetch domain 事件交给外部 handler
    if (this._fetchHandler) {
      this._fetchHandler(method, params);
    }

    if (method === "Network.requestWillBeSent") {
      this.networkLog.push({
        requestId: params.requestId,
        url: params.request.url,
        method: params.request.method,
        type: params.type || "Unknown",
        timestamp: params.timestamp,
        headers: params.request.headers,
        postData: params.request.postData,
      });
      if (this.networkLog.length > this.maxNetworkLogSize) {
        this.networkLog.shift();
      }
    } else if (method === "Network.responseReceived") {
      const entry = this.networkLog.find(e => e.requestId === params.requestId);
      if (entry) {
        entry.status = params.response.status;
        entry.statusText = params.response.statusText;
        entry.mimeType = params.response.mimeType;
        entry.responseHeaders = params.response.headers;
      }
    }
  }
}

module.exports = { CDPClient };
