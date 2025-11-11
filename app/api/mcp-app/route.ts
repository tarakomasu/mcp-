/**
 * App Router版のMCPエンドポイント
 *
 * 注意: このファイルは参考用です。
 * App RouterのNextResponseはNode.jsの標準ServerResponseと互換性がないため、
 * StreamableHTTPServerTransportと直接使用することはできません。
 *
 * 実際に動作するのは pages/api/mcp.ts (Pages Router版) です。
 *
 * このエンドポイントは /api/mcp-app でアクセス可能ですが、
 * 正常に動作しない可能性があります。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

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
 * MCPリクエストを安全に処理するためのヘルパー関数。
 * リクエストごとに新しいトランスポートを生成し、エラーハンドリングを行います。
 *
 * 注意: App RouterのNextResponse/NextRequestはNode.js標準のHTTPオブジェクトではないため、
 * StreamableHTTPServerTransportと互換性がありません。
 *
 * @param request - Next.jsのNextRequestオブジェクト
 * @param body - (オプション) POSTリクエストのパース済みボディ
 * @returns Next.jsのNextResponseオブジェクト
 */
async function handleMcpRequest(request: NextRequest, body?: unknown) {
  // 1. リクエストごとにトランスポートを生成し、ステートレスにする
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  try {
    // 2. リクエストごとにサーバーとトランスポートを接続
    await server.connect(transport);

    const response = new NextResponse();

    // CORS ヘッダーを追加
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, DELETE, OPTIONS"
    );
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    // 3. リクエストを処理
    // 警告: NextRequest/NextResponseはNode.js標準HTTPと互換性がないため、
    // 以下のコードは "writeHead is not a function" エラーを起こす可能性があります
    await transport.handleRequest(request as any, response as any, body);

    return response;
  } catch (error) {
    // 4. エラーハンドリング
    console.error("MCP request handling failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } finally {
    // 5. リソースのクリーンアップ
    try {
      await server.close();
    } catch (closeError) {
      console.error("Failed to close server connection:", closeError);
    }
  }
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    // JSONのパースに失敗した場合
    console.error("Invalid JSON body:", error);
    return new NextResponse(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, // Bad Request
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return handleMcpRequest(request, body);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
