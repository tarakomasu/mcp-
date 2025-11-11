import type { NextApiRequest, NextApiResponse } from "next";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// McpServerのインスタンスはステートレスなので、アプリケーション全体で共有してOK
const server = new McpServer({
  name: "char-counter-server",
  version: "1.0.0",
});

// ツールの登録も起動時に一度だけでOK
server.registerTool(
  "countCharacters",
  {
    description: "Count the number of characters in a text",
    inputSchema: {
      text: z.string(),
    },
  },
  async (args) => {
    const count = args.text.length;
    return {
      content: [{ type: "text", text: `The text has ${count} characters.` }],
    };
  }
);

/**
 * MCPリクエストを安全に処理するためのヘルパー関数
 */
async function handleMcpRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  body?: unknown
) {
  try {
    // リクエストごとにトランスポートを生成し、ステートレスにする
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    // レスポンスが閉じられたらトランスポートをクリーンアップ
    res.on("close", () => {
      transport.close();
    });

    // サーバーとトランスポートを接続
    await server.connect(transport);

    // CORS ヘッダーを追加
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // リクエストを処理
    // Pages Router の req/res は Node.js の標準的な IncomingMessage/ServerResponse なので互換性がある
    await transport.handleRequest(req as any, res as any, body);
  } catch (error) {
    console.error("MCP request handling failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: errorMessage,
        },
        id: null,
      });
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  // CORS プリフライトリクエスト
  if (method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }

  // GET, POST, DELETE リクエスト
  if (method === "GET") {
    await handleMcpRequest(req, res);
  } else if (method === "POST") {
    // POSTの場合は req.body を渡す
    await handleMcpRequest(req, res, req.body);
  } else if (method === "DELETE") {
    await handleMcpRequest(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE", "OPTIONS"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
