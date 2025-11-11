# ロギングガイド

## 📊 実装されたログ機能

Vercel側で以下のログが出力されるようになりました。

## 🔍 ログの種類

### 1. リクエストログ
すべてのHTTPリクエストに対して出力されます。

```
[2025-01-11T12:34:56.789Z] MCP Request: POST /api/mcp
[MCP] JSON-RPC Method: tools/call
[MCP] Tool Name: countCharacters
```

### 2. ツール呼び出しログ
ツールが呼ばれた時に詳細情報を出力します。

```json
[MCP Tool] countCharacters called
[MCP Tool] Input: {
  "text": "Hello, World!"
}
```

### 3. ツール実行結果ログ
ツールの実行が成功した時に結果を出力します。

```json
[MCP Tool] countCharacters succeeded
[MCP Tool] Result: {
  "count": 13,
  "duration": "0ms"
}
[MCP Tool] Response: {
  "content": [
    {
      "type": "text",
      "text": "The text has 13 characters."
    }
  ]
}
```

### 4. エラーログ
エラーが発生した場合に出力されます。

```
MCP request handling failed: Error: ...
```

## 📍 Vercelでログを確認する方法

### 1. **リアルタイムログ（開発時）**
```bash
vercel logs --follow
```

### 2. **Vercel Dashboard**
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Deployments** タブを開く
4. 最新のデプロイメントをクリック
5. **Functions** タブで `/api/mcp` を選択
6. ログが表示されます

### 3. **CLIで過去のログを確認**
```bash
# 最新100件のログを表示
vercel logs

# 特定のデプロイメントのログを表示
vercel logs [deployment-url]
```

## 🎯 ログ出力例

### ChatGPTからのツール呼び出し

```
[2025-01-11T10:30:45.123Z] MCP Request: POST /api/mcp
[MCP] JSON-RPC Method: initialize
[MCP] JSON-RPC Method: tools/list
[MCP] JSON-RPC Method: tools/call
[MCP] Tool Name: countCharacters
[MCP Tool] countCharacters called
[MCP Tool] Input: {
  "text": "This is a test message from ChatGPT"
}
[MCP Tool] countCharacters succeeded
[MCP Tool] Result: {
  "count": 35,
  "duration": "1ms"
}
[MCP Tool] Response: {
  "content": [
    {
      "type": "text",
      "text": "The text has 35 characters."
    }
  ]
}
```

## 🔧 カスタマイズ

### より詳細なログを追加する場合

`pages/api/mcp.ts` のツール関数内にログを追加できます：

```typescript
server.registerTool(
  "countCharacters",
  {
    description: "Count the number of characters in a text",
    inputSchema: {
      text: z.string(),
    },
  },
  async (args) => {
    console.log("[MCP Tool] countCharacters called");
    console.log("[MCP Tool] Input:", JSON.stringify(args, null, 2));
    
    // 追加のカスタムログ
    console.log("[Custom] Processing text of length:", args.text.length);
    console.log("[Custom] Text preview:", args.text.substring(0, 50));
    
    const startTime = Date.now();
    const count = args.text.length;
    const duration = Date.now() - startTime;
    
    // ... 以下省略
  }
);
```

### 環境別のログレベル設定

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  console.log("[DEBUG] Full request body:", JSON.stringify(req.body, null, 2));
}
```

## 📝 ログのベストプラクティス

### ✅ 推奨
- 構造化されたJSON形式でログ出力
- タイムスタンプを含める
- エラー情報を詳細に記録
- 実行時間を計測

### ⚠️ 注意
- 機密情報（API キー、パスワードなど）をログに出力しない
- 大量のデータをログに出力しすぎない（コストが増加します）
- 本番環境では必要最小限のログに抑える

## 💰 Vercelのログ制限

- **無料プラン**: ログは24時間保持
- **Pro プラン**: ログは最大30日保持
- **Enterprise プラン**: カスタム保持期間

詳細: [Vercel Pricing](https://vercel.com/pricing)

## 🚀 デプロイ後の確認

デプロイ後、ChatGPTからツールを呼び出して、Vercelのダッシュボードでログを確認してください：

```bash
# ログをフォロー
vercel logs --follow

# または
vercel logs https://your-app.vercel.app
```

## 🔗 関連ドキュメント

- [Vercel Logs Documentation](https://vercel.com/docs/concepts/observability/logs)
- [Next.js API Routes Logging](https://nextjs.org/docs/api-routes/introduction)

