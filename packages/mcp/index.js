const path = require("path");
const fs = require("fs");

if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  const { execSync } = require("child_process");
  process.stderr.write("Installing MCP dependencies...\n");
  execSync("npm install --production", { cwd: __dirname, stdio: "inherit" });
}

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { ListToolsRequestSchema, CallToolRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { CDPClient } = require("./cdp.js");
const { LiveDanmakuClient } = require("./danmaku.js");
const { TOOLS, executeTool } = require("./tools.js");

const CDP_PORT = parseInt(process.env.CDP_PORT || "9222", 10);
const cdp = new CDPClient(CDP_PORT);
const danmaku = new LiveDanmakuClient();

const server = new Server(
  { name: "bililoader-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const content = await executeTool({ cdp, danmaku }, name, args || {});
    return { content, isError: false };
  } catch (e) {
    return {
      content: [{ type: "text", text: `错误: ${e.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  process.stderr.write(`MCP Server 启动失败: ${e.message}\n`);
  process.exit(1);
});
