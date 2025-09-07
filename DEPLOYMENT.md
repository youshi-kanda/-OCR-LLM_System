# 🚀 Siwake システム - クライアント展開ガイド

## 📋 概要
このガイドでは、Siwakeシステムをクライアントが体験できるように展開する方法を説明します。

## 🎯 推奨展開方法

### 1. Railway.app（最も簡単）⭐
**所要時間**: 5分
**料金**: 月$5（無料期間あり）

```bash
# 1. Railway CLIをインストール
npm install -g @railway/cli

# 2. Railwayにログイン
railway login

# 3. プロジェクトを作成して展開
railway init
railway up
```

**環境変数の設定**:
- `OPENAI_API_KEY`: OpenAI APIキー
- `ANTHROPIC_API_KEY`: Claude APIキー
- `DATABASE_URL`: 自動設定
- `REDIS_URL`: 自動設定

### 2. Render.com（無料プラン対応）
**所要時間**: 10分
**料金**: 無料（制限あり）

```bash
# 1. GitHubリポジトリをRender.comに接続
# 2. render.yamlから自動展開
```

**設定手順**:
1. [Render.com](https://render.com)にサインアップ
2. GitHubアカウントを連携
3. `youshi-kanda/-OCR-LLM_System`リポジトリを選択
4. 自動的に`render.yaml`から展開開始

### 3. Google Cloud Run（本格運用向け）
**所要時間**: 15分
**料金**: 使用量課金

## 🔧 事前準備

### APIキーの準備
どちらか一つが必要です：
- **OpenAI APIキー** (GPT-4V使用)
- **Anthropic APIキー** (Claude使用)

### GitHub リポジトリ
現在のコード: https://github.com/youshi-kanda/-OCR-LLM_System

## 📱 クライアント体験用URL

### Railway展開後
```
https://[プロジェクト名]-production.up.railway.app
```

### Render展開後
```
https://siwake-app.onrender.com
```

## 🎮 クライアント体験フロー

### 1. ファイルアップロード
- PDFまたは画像をドラッグ&ドロップ
- リアルタイム進捗表示
- 複数ページ対応

### 2. AI処理結果確認
- 銀行取引データの自動抽出
- 半角カナ自動変換
- 学習システムによる精度向上

### 3. データ編集・学習
- インライン編集でデータ修正
- 修正内容を自動学習（2-3回で反映）
- 列の表示・非表示設定

### 4. エクスポート
- 標準CSV、Excel用、会計ソフト用
- カスタム列選択
- フォーマット設定

## 🏗️ 展開手順（Railway推奨）

### ステップ1: 準備
```bash
cd C:\Users\rockr\desk-mori\siwake\siwake-ver3.1
npm install -g @railway/cli
railway login
```

### ステップ2: 展開
```bash
railway init
railway add postgresql
railway add redis
railway up
```

### ステップ3: 環境変数設定
Railway ダッシュボードで以下を設定：
```
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### ステップ4: 動作確認
展開されたURLでアプリケーションをテスト

## 🔍 トラブルシューティング

### ビルドエラー
- `Dockerfile.railway`を使用していることを確認
- 依存関係の問題: `npm ci --production`を実行

### データベース接続エラー
- PostgreSQLサービスが起動していることを確認
- 環境変数`DATABASE_URL`が正しく設定されているか確認

### APIエラー
- APIキーが正しく設定されているか確認
- API制限に達していないか確認

## 📞 サポート

展開中に問題が発生した場合：
1. ログを確認: `railway logs`
2. GitHub Issues: https://github.com/youshi-kanda/-OCR-LLM_System/issues
3. 詳細ログで原因を特定

## 🎯 次のステップ

クライアント体験後の改善点：
1. 複数ファイル同時アップロード
2. バッチ処理機能
3. ユーザー管理機能
4. API制限の最適化