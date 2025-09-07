# 🚀 Siwake銀行取引データ読み取りシステム - セットアップガイド

## 📋 必要な環境
- Windows 10/11 または macOS
- Docker Desktop
- Git
- OpenAI APIキー または Anthropic APIキー

## 🔧 セットアップ手順

### 1. Docker Desktopのインストール
1. [Docker Desktop](https://www.docker.com/products/docker-desktop/)をダウンロード
2. インストール後、Docker Desktopを起動

### 2. プロジェクトのクローン
```bash
git clone https://github.com/youshi-kanda/-OCR-LLM_System.git
cd -OCR-LLM_System
```

### 3. 環境変数の設定
`.env`ファイルを作成：
```bash
# OpenAI API（GPT-4V使用の場合）
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API（Claude使用の場合）
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 4. アプリケーションの起動
```bash
docker-compose up -d
```

### 5. アクセス
ブラウザで以下のURLを開く：
```
http://localhost:3000
```

## 🎯 使い方

### ファイルアップロード
1. PDFまたは画像ファイルをドラッグ&ドロップ
2. 自動的にAI処理が開始
3. 進捗バーで処理状況を確認

### データ編集
1. 抽出されたデータを確認
2. 必要に応じて修正（学習システムが記憶）
3. 列の設定で表示カスタマイズ可能

### エクスポート
1. 「カスタムエクスポート」をクリック
2. 必要な列を選択
3. フォーマットを選択（標準CSV、Excel用、会計ソフト用）
4. ダウンロード

## 🔥 主な機能
- ✅ 複数ページPDF対応
- ✅ 自動学習システム（修正パターンを記憶）
- ✅ 半角カナ自動変換
- ✅ 銀行別フォーマット対応
- ✅ リアルタイム進捗表示
- ✅ カスタムCSVエクスポート

## 🆘 トラブルシューティング

### Dockerが起動しない
- Docker Desktopが起動していることを確認
- WSL2（Windows）が有効になっているか確認

### APIエラーが出る
- `.env`ファイルのAPIキーを確認
- APIの利用制限を確認

### ポート3000が使用中
```bash
# 別のポートで起動
docker-compose down
# docker-compose.ymlのポート設定を変更
# frontend: ports: - "3001:3000"
docker-compose up -d
```

## 📞 サポート
問題が発生した場合は、GitHubのIssuesに報告してください。