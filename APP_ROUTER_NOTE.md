# App Router 実装について

## 📁 ファイル構成

```
├── pages/api/mcp.ts          ✅ 動作する実装（Pages Router）
└── app/api/mcp-app/route.ts  ⚠️  参考用（App Router - 非推奨）
```

## ⚠️ App Router の制限

### 問題
App Router (`app/api/mcp-app/route.ts`) は以下の理由で **正常に動作しません**:

1. **NextResponse/NextRequest が Node.js 標準 HTTP オブジェクトではない**
   - `StreamableHTTPServerTransport` は Node.js の `ServerResponse` を期待
   - App Router は独自の Response API を使用
   - 結果: `t.writeHead is not a function` エラー

2. **型の不一致**
   ```typescript
   // ❌ App Router - 互換性なし
   await transport.handleRequest(
     request as NextRequest,    // Web Standard Request
     response as NextResponse   // Web Standard Response
   );
   
   // ✅ Pages Router - 互換性あり
   await transport.handleRequest(
     req as IncomingMessage,    // Node.js standard
     res as ServerResponse      // Node.js standard
   );
   ```

## ✅ 推奨: Pages Router を使用

**`pages/api/mcp.ts`** を使用してください。こちらは完全に動作します。

### Pages Router の利点
- ✅ Node.js 標準 HTTP オブジェクトを使用
- ✅ MCP SDK と完全互換
- ✅ エラーなく動作
- ✅ Vercel にデプロイ可能

### アクセス URL
- Pages Router: `https://your-app.vercel.app/api/mcp` ✅
- App Router: `https://your-app.vercel.app/api/mcp-app` ⚠️ (動作しない可能性大)

## 🔧 App Router で動作させる方法（将来的）

App Router で MCP を動作させるには、以下のいずれかが必要です:

### 方法1: アダプターレイヤーの実装
NextResponse を Node.js ServerResponse に変換するアダプターを作成:

```typescript
class NextResponseAdapter {
  constructor(private nextResponse: NextResponse) {}
  
  writeHead(statusCode: number, headers: Record<string, string>) {
    this.nextResponse.status = statusCode;
    Object.entries(headers).forEach(([key, value]) => {
      this.nextResponse.headers.set(key, value);
    });
  }
  
  // その他のメソッドも実装...
}
```

### 方法2: MCP SDK の拡張
`StreamableHTTPServerTransport` を拡張して NextResponse をサポート:

```typescript
class NextJsStreamableTransport extends StreamableHTTPServerTransport {
  async handleNextRequest(req: NextRequest, res: NextResponse) {
    // NextRequest/NextResponse を処理するカスタム実装
  }
}
```

### 方法3: MCP SDK の更新を待つ
MCP SDK が将来的に Next.js App Router をネイティブサポートする可能性があります。

## 📚 参考資料

- [Next.js App Router vs Pages Router](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Node.js HTTP ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse)
- [Web Standard Response API](https://developer.mozilla.org/en-US/docs/Web/API/Response)

## 💡 結論

**現時点では `pages/api/mcp.ts` を使用してください。**

App Router 版 (`app/api/mcp-app/route.ts`) は参考用として残していますが、
実際のプロダクションでは使用しないでください。

