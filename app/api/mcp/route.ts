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
 * @param request - Next.jsのNextRequestオブジェクト
 * @param body - (オプション) POSTリクエストのパース済みボディ
 * @returns Next.jsのNextResponseオブジェクト
 */
async function handleMcpRequest(request: NextRequest, body?: unknown) {
  try {
    // 1. リクエストごとにトランスポートを生成し、ステートレスにする
    const transport = new StreamableHTTPServerTransport({});

    // 2. リクエストごとにサーバーとトランスポートを接続
    await server.connect(transport);

    const response = new NextResponse();

    // 3. リクエストを処理
    // `any`キャストは残りますが、インスタンスがリクエスト内に限定されているため安全性が向上しています。
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
      },
    });
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
