# Siwake Ver3.1 - 銀行通帳データ読み取りシステム

Railway Deployment Update: 2025-09-08 13:45 JST

日本の銀行通帳の画像やPDFファイルから取引データを自動抽出するWebアプリケーションです。Claude 3.5 SonnetとGPT-4oのデュアルAI処理により高精度な文字認識を実現しています。

## 🚀 主な機能

- **多形式対応**: PDF、JPEG、PNG形式のファイルに対応
- **複数ページPDF**: 2ページ以上のPDFファイルも完全対応
- **リアルタイム進捗表示**: WebSocketによるリアルタイム処理状況表示
- **デュアルAI処理**: Claude 3.5 Sonnet + GPT-4oによる高精度認識
- **半角カナ対応**: 半角カタカナの自動全角変換
- **データ編集**: 抽出後のデータをブラウザ上で編集可能
- **CSV出力**: 処理結果をExcel互換のCSVファイルでダウンロード
- **履歴管理**: 過去の処理履歴を一覧表示・再利用

## 🛠️ 技術スタック

### フロントエンド
- React 18 + TypeScript
- Material-UI (MUI) v5
- React Router v6
- WebSocket通信
- React Dropzone

### バックエンド
- FastAPI (Python)
- PostgreSQL
- Redis
- WebSocket
- PyMuPDF (PDF処理)
- Pillow (画像処理)

### AI・機械学習
- Anthropic Claude 3.5 Sonnet
- OpenAI GPT-4o
- 文字認識・OCR処理

### インフラ
- Docker Compose
- Nginx (リバースプロキシ)

## システム構成

```
├── backend/     # FastAPI + LLM処理
├── frontend/    # React + TypeScript UI
├── db/          # PostgreSQL初期化
└── docker-compose.yml
```

## 必要要件

- Docker Desktop
- OpenAI API Key
- Anthropic API Key

## セットアップ手順

### 1. 環境変数設定

```bash
cp .env.example .env
```

`.env`ファイルを編集してAPIキーを設定:

```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. システム起動

```bash
# 全サービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 3. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 使用方法

1. **ファイルアップロード**
   - PDFまたは画像ファイルをドラッグ&ドロップ
   - 自動でLLM処理が開始

2. **データ確認・編集**
   - 抽出データをテーブル形式で表示
   - インライン編集で修正可能
   - 信頼度による色分け表示

3. **CSV出力**
   - 修正済みデータをCSV形式でダウンロード
   - V2-min形式対応

## LLM処理方式

### 段階的処理（推奨）
```
Claude（構造化抽出） → GPT-4V（数値検証） → 結果統合
```

### 並列処理
```
Claude ─┐
        ├─ 結果比較・統合
GPT-4V ─┘
```

## 開発コマンド

```bash
# システム停止
docker-compose down

# 再ビルド
docker-compose up --build

# 特定サービスのログ
docker-compose logs backend
docker-compose logs frontend

# データベースリセット
docker-compose down -v
docker-compose up -d
```

## 性能指標

- **処理時間**: 30-60秒/ページ
- **精度**: 97-99%
- **人間確認率**: 1-3%
- **対応形式**: PDF, JPEG, PNG

## トラブルシューティング

### よくある問題

1. **APIキーエラー**
   ```
   Error: Invalid API key
   ```
   → `.env`ファイルのAPIキーを確認

2. **ポート競合**
   ```
   Error: Port already in use
   ```
   → 他のサービスを停止するか、`docker-compose.yml`のポート番号を変更

3. **メモリ不足**
   ```
   Error: Container killed (OOMKilled)
   ```
   → Docker Desktopのメモリ割り当てを増加

### ログ確認

```bash
# 全サービスのログ
docker-compose logs

# エラーのみ表示
docker-compose logs | grep -i error

# 特定時間のログ
docker-compose logs --since="2024-01-01T00:00:00"
```

## 📊 処理フロー

```
PDF/画像ファイル 
    ↓
画像変換・最適化 (0-10%)
    ↓
Claude 3.5 Sonnet解析 (10-50%)
    ↓
GPT-4o検証処理 (50-90%)
    ↓
結果統合・正規化 (90-100%)
    ↓
データベース保存・表示
```

## 📝 更新履歴

### v3.1 (最新)
- ✅ 複数ページPDF完全対応
- ✅ リアルタイム進捗表示（WebSocket）
- ✅ 半角カタカナ自動変換
- ✅ 視覚的進捗バー（0-100%表示）
- ✅ 信頼度計算ロジック改善
- ✅ データ編集機能強化

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。

## ライセンス

MIT License

## サポート

技術的な問題やバグレポートは Issues にて報告してください。