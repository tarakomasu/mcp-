# MCP サーバー設定ガイド

## 🔧 修正内容

### 問題
元の `app/api/mcp/route.ts`（App Router）では、Next.jsの `NextResponse` オブジェクトが `StreamableHTTPServerTransport` の期待する Node.js 標準の `ServerResponse` と互換性がなく、`t.writeHead is not a function` エラーが発生していました。

### 解決策
**Pages Router** (`pages/api/mcp.ts`) に移行しました。Pages Router は Node.js の標準的な `IncomingMessage` と `ServerResponse` を使用しているため、MCP SDK と完全に互換性があります。

## 📁 ファイル構成

```
/Users/nao/invdev/mcp-/
├── pages/
│   └── api/
│       └── mcp.ts          # MCPエンドポイント（Pages Router）
├── app/                     # App Router（フロントエンド用）
│   └── ...
├── package.json
└── MCP_SETUP.md            # このファイル
```

## 🚀 デプロイ手順

### 1. Vercel へデプロイ

```bash
# Vercel CLI をインストール（未インストールの場合）
npm i -g vercel

# プロジェクトをデプロイ
vercel
```

デプロイ完了後、URLが発行されます（例: `https://your-app.vercel.app`）

### 2. ChatGPT に登録

1. **ChatGPT を開く**
2. **Settings** → **Connectors** → **Advanced** → **Developer mode** を有効化
3. **Settings** → **Connectors** タブで **Create** をクリック
4. 以下を入力:
   - **Name**: `Char Counter MCP` (任意の名前)
   - **MCP server URL**: `https://your-app.vercel.app/api/mcp`
   - **Authentication**: `認証なし`
5. **Create** をクリック

## 🧪 ローカルテスト

### サーバー起動
```bash
npm run dev
```

### 動作確認
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'
```

### ツールのテスト
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "countCharacters",
      "arguments": {"text": "Hello, World!"}
    },
    "id": 2
  }'
```

## 📝 実装の詳細

### 主要な変更点

1. **Pages Router の使用**
   - `pages/api/mcp.ts` を使用することで Node.js 標準の req/res を使用
   - `StreamableHTTPServerTransport` と完全互換

2. **ステートレス設計**
   ```typescript
   const transport = new StreamableHTTPServerTransport({
     sessionIdGenerator: undefined,  // セッション不要
     enableJsonResponse: true,       // JSON レスポンスを有効化
   });
   ```

3. **CORS 対応**
   - ChatGPT からのブラウザアクセスに対応
   - すべてのメソッド（GET, POST, DELETE, OPTIONS）でCORSヘッダーを設定

4. **適切なクリーンアップ**
   ```typescript
   res.on('close', () => {
     transport.close();  // リソースを適切に解放
   });
   ```

## 🛠️ 利用可能なツール

### countCharacters
- **説明**: テキストの文字数をカウント
- **入力**: `{ text: string }`
- **出力**: 文字数を含むテキストレスポンス

## 🔍 トラブルシューティング

### エラー: "writeHead is not a function"
→ App Router を使用している場合に発生。Pages Router に移行してください。

### エラー: "Method Not Allowed"
→ エンドポイントが GET, POST, DELETE, OPTIONS のみをサポートしています。

### CORS エラー
→ `/api/mcp` エンドポイントで自動的に CORS ヘッダーが設定されます。

## 📚 参考資料

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Next.js Pages Router API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [Vercel Deployment](https://vercel.com/docs/deployments/overview)

