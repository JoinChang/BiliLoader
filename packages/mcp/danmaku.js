/**
 * B站直播弹幕 WebSocket 客户端
 *
 * 协议格式（大端序）：
 *   Header (16 bytes):
 *     [0-3]   packetLen   包总长度
 *     [4-5]   headerLen   固定 16
 *     [6-7]   protoVer    0=JSON, 2=zlib, 3=brotli
 *     [8-11]  operation   2=心跳, 3=心跳回复, 5=消息, 7=认证, 8=认证回复
 *     [12-15] sequence    固定 1
 *   Body: JSON 或压缩数据
 */

const WebSocket = require("ws");
const zlib = require("zlib");

const OP_HEARTBEAT = 2;
const OP_HEARTBEAT_REPLY = 3;
const OP_MESSAGE = 5;
const OP_AUTH = 7;
const OP_AUTH_REPLY = 8;

const DEFAULT_WS_HOST = "wss://broadcastlv.chat.bilibili.com/sub";
const HEARTBEAT_INTERVAL = 30000;

class LiveDanmakuClient {
  constructor() {
    this.ws = null;
    this.heartbeatTimer = null;
    this.roomId = null;
    this.messages = [];        // 弹幕消息缓冲
    this.maxMessages = 200;
    this.connected = false;
  }

  /**
   * 连接到直播间弹幕服务器
   * @param {number} roomId 直播间 ID
   * @param {object} options { uid, key(token), buvid, host, wssPort }
   */
  connect(roomId, { uid = 0, key = "", buvid = "", host = "", wssPort = 0 } = {}) {
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.roomId = roomId;
      this.messages = [];

      const wsUrl = host && wssPort
        ? `wss://${host}:${wssPort}/sub`
        : DEFAULT_WS_HOST;
      this.ws = new WebSocket(wsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": "https://live.bilibili.com",
        },
      });

      this.ws.on("open", () => {
        // 发送认证包
        const authBody = JSON.stringify({
          uid: parseInt(uid) || 0,
          roomid: parseInt(roomId),
          protover: 3,
          buvid: buvid || "",
          platform: "web",
          type: 2,
          key: key || "",
        });
        this._sendPacket(OP_AUTH, authBody);
      });

      this.ws.on("message", (data) => {
        try {
          this._onMessage(Buffer.from(data));
        } catch (e) {
          // 解析错误忽略
        }
      });

      this.ws.on("error", (e) => {
        if (!this.connected) reject(new Error(`弹幕连接失败: ${e.message}`));
      });

      this.ws.on("close", () => {
        this._cleanup();
      });

      // 等待认证回复
      this._onAuthReply = (success) => {
        if (success) {
          this.connected = true;
          this._startHeartbeat();
          resolve();
        } else {
          reject(new Error("弹幕认证失败"));
        }
        this._onAuthReply = null;
      };

      setTimeout(() => {
        if (!this.connected) {
          this.disconnect();
          reject(new Error("弹幕连接超时"));
        }
      }, 10000);
    });
  }

  disconnect() {
    this._cleanup();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.roomId = null;
  }

  /**
   * 获取最近的弹幕消息
   */
  getMessages(limit = 20) {
    return this.messages.slice(-limit);
  }

  /**
   * 清空消息缓冲
   */
  clearMessages() {
    this.messages = [];
  }

  // ==================== 内部方法 ====================

  _cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _startHeartbeat() {
    // 立即发送第一次心跳
    this._sendPacket(OP_HEARTBEAT, "");
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this._sendPacket(OP_HEARTBEAT, "");
      }
    }, HEARTBEAT_INTERVAL);
  }

  _sendPacket(operation, body) {
    const bodyBuf = Buffer.from(body, "utf-8");
    const headerLen = 16;
    const packet = Buffer.alloc(headerLen + bodyBuf.length);

    packet.writeUInt32BE(packet.length, 0);    // packetLen
    packet.writeUInt16BE(headerLen, 4);         // headerLen
    packet.writeUInt16BE(1, 6);                 // protoVer (raw JSON for sending)
    packet.writeUInt32BE(operation, 8);         // operation
    packet.writeUInt32BE(1, 12);                // sequence
    bodyBuf.copy(packet, headerLen);

    this.ws.send(packet);
  }

  _onMessage(buf) {
    const packets = this._parsePackets(buf);
    for (const pkt of packets) {
      switch (pkt.operation) {
        case OP_AUTH_REPLY:
          if (this._onAuthReply) {
            const reply = pkt.body.length ? JSON.parse(pkt.body.toString("utf-8")) : {};
            this._onAuthReply(reply.code === 0 || !reply.code);
          }
          break;

        case OP_HEARTBEAT_REPLY:
          // 心跳回复，前 4 字节是人气值
          break;

        case OP_MESSAGE:
          this._handleMessage(pkt.body);
          break;
      }
    }
  }

  _parsePackets(buf) {
    const packets = [];
    let offset = 0;

    while (offset < buf.length) {
      if (offset + 16 > buf.length) break;

      const packetLen = buf.readUInt32BE(offset);
      const headerLen = buf.readUInt16BE(offset + 4);
      const protoVer = buf.readUInt16BE(offset + 6);
      const operation = buf.readUInt32BE(offset + 8);

      if (offset + packetLen > buf.length) break;

      const body = buf.slice(offset + headerLen, offset + packetLen);

      if (protoVer === 2) {
        // zlib 压缩
        try {
          const decompressed = zlib.inflateSync(body);
          packets.push(...this._parsePackets(decompressed));
        } catch (e) { /* ignore */ }
      } else if (protoVer === 3) {
        // brotli 压缩
        try {
          const decompressed = zlib.brotliDecompressSync(body);
          packets.push(...this._parsePackets(decompressed));
        } catch (e) { /* ignore */ }
      } else {
        packets.push({ operation, body });
      }

      offset += packetLen;
    }

    return packets;
  }

  _handleMessage(body) {
    try {
      const json = JSON.parse(body.toString("utf-8"));
      const cmd = json.cmd;

      if (cmd === "DANMU_MSG") {
        const info = json.info;
        this.messages.push({
          type: "danmaku",
          user: info[2]?.[1] || "未知",
          uid: info[2]?.[0],
          content: info[1],
          timestamp: info[0]?.[4] || Date.now(),
          medal: info[3]?.length ? {
            name: info[3][1],
            level: info[3][0],
            anchor: info[3][2],
          } : undefined,
        });
      } else if (cmd === "SEND_GIFT") {
        const data = json.data;
        this.messages.push({
          type: "gift",
          user: data.uname,
          uid: data.uid,
          gift: data.giftName,
          count: data.num,
          price: data.price,
          timestamp: data.timestamp * 1000,
        });
      } else if (cmd === "SUPER_CHAT_MESSAGE") {
        const data = json.data;
        this.messages.push({
          type: "superchat",
          user: data.user_info?.uname || "未知",
          uid: data.uid,
          content: data.message,
          price: data.price,
          timestamp: data.ts * 1000,
        });
      } else if (cmd === "INTERACT_WORD") {
        const data = json.data;
        this.messages.push({
          type: "enter",
          user: data.uname,
          uid: data.uid,
          timestamp: data.timestamp * 1000,
        });
      } else if (cmd === "GUARD_BUY") {
        const data = json.data;
        this.messages.push({
          type: "guard",
          user: data.username,
          uid: data.uid,
          guardLevel: data.guard_level,
          count: data.num,
          price: data.price,
          timestamp: Date.now(),
        });
      }

      // 限制缓冲区大小
      if (this.messages.length > this.maxMessages) {
        this.messages = this.messages.slice(-this.maxMessages);
      }
    } catch (e) {
      // 非 JSON 或解析失败，忽略
    }
  }
}

module.exports = { LiveDanmakuClient };
