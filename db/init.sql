-- データベース初期化スクリプト
CREATE DATABASE IF NOT EXISTS siwake_db;

\c siwake_db;

-- 処理結果テーブル
CREATE TABLE IF NOT EXISTS processing_results (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    confidence_score FLOAT DEFAULT 0.0,
    processing_time FLOAT DEFAULT 0.0,
    processing_method VARCHAR(20),
    claude_confidence FLOAT,
    gpt4v_confidence FLOAT,
    agreement_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 取引データテーブル
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    processing_result_id VARCHAR(36) REFERENCES processing_results(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL,
    description TEXT NOT NULL,
    withdrawal DECIMAL(15,2),
    deposit DECIMAL(15,2),
    balance DECIMAL(15,2) NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    -- 動的列用のJSONデータ（bank_code, branch, category, vendor等）
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_processing_results_created_at ON processing_results(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_processing_result_id ON transactions(processing_result_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- 更新時刻を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_processing_results_updated_at 
    BEFORE UPDATE ON processing_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期ユーザー作成（必要に応じて）
-- CREATE USER siwake_user WITH PASSWORD 'siwake_password';
-- GRANT ALL PRIVILEGES ON DATABASE siwake_db TO siwake_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO siwake_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO siwake_user;