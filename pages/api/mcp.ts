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
    // ツール呼び出し開始ログ
    console.log("[MCP Tool] countCharacters called");
    console.log("[MCP Tool] Input:", JSON.stringify(args, null, 2));

    const startTime = Date.now();
    const count = args.text.length;
    const duration = Date.now() - startTime;

    const result = {
      content: [
        { type: "text" as const, text: `The text has ${count} characters.` },
      ],
    };

    // ツール呼び出し成功ログ
    console.log("[MCP Tool] countCharacters succeeded");
    console.log(
      "[MCP Tool] Result:",
      JSON.stringify({ count, duration: `${duration}ms` }, null, 2)
    );
    console.log("[MCP Tool] Response:", JSON.stringify(result, null, 2));

    return result;
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
  const timestamp = new Date().toISOString();

  // リクエストログ
  console.log(`[${timestamp}] MCP Request: ${method} /api/mcp`);

  if (method === "POST" && req.body) {
    const body = req.body as any;
    if (body.method) {
      console.log(`[MCP] JSON-RPC Method: ${body.method}`);
      if (body.method === "tools/call" && body.params) {
        console.log(`[MCP] Tool Name: ${body.params.name}`);
      }
    }
  }

  // CORS プリフライトリクエスト
  if (method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    console.log(`[${timestamp}] MCP Response: OPTIONS 204`);
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
    console.log(`[${timestamp}] MCP Response: 405 Method Not Allowed`);
  }
}
