-- 学習システム用のテーブル追加
-- 002_learning_system.sql

-- 修正履歴テーブル
CREATE TABLE IF NOT EXISTS correction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id VARCHAR(255),
    original_data JSONB NOT NULL,
    corrected_data JSONB NOT NULL,
    correction_type VARCHAR(50) NOT NULL,
    position_info JSONB,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_correction_file_id ON correction_history (file_id);
CREATE INDEX IF NOT EXISTS idx_correction_type ON correction_history (correction_type);
CREATE INDEX IF NOT EXISTS idx_correction_created ON correction_history (created_at);

-- 学習パターンテーブル
CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) NOT NULL,
    original_pattern TEXT NOT NULL,
    corrected_pattern TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence_score FLOAT DEFAULT 0.5,
    bank_name VARCHAR(255),
    context JSONB,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pattern_type ON learning_patterns (pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_bank ON learning_patterns (bank_name);
CREATE INDEX IF NOT EXISTS idx_pattern_frequency ON learning_patterns (frequency DESC);

-- カラムマッピングテーブル
CREATE TABLE IF NOT EXISTS column_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(255),
    original_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    standard_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    position INTEGER NOT NULL,
    validation_rules JSONB,
    is_visible BOOLEAN DEFAULT TRUE,
    is_editable BOOLEAN DEFAULT TRUE,
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_bank_column ON column_mappings (bank_name, original_name);
CREATE INDEX IF NOT EXISTS idx_mapping_bank ON column_mappings (bank_name);
CREATE INDEX IF NOT EXISTS idx_mapping_position ON column_mappings (position);

-- カスタム列テーブル
CREATE TABLE IF NOT EXISTS custom_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id VARCHAR(255),
    column_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    default_value TEXT,
    formula TEXT,
    options JSONB,
    values JSONB NOT NULL,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_file_id ON custom_columns (file_id);

-- エクスポートプリセットテーブル
CREATE TABLE IF NOT EXISTS export_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    preset_name VARCHAR(255) NOT NULL,
    description TEXT,
    columns JSONB NOT NULL,
    export_settings JSONB NOT NULL,
    target_software VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_preset_user ON export_presets (user_id);
CREATE INDEX IF NOT EXISTS idx_preset_name ON export_presets (preset_name);

-- 欠損パターンテーブル
CREATE TABLE IF NOT EXISTS missing_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(255),
    page_position JSONB NOT NULL,
    missed_content JSONB NOT NULL,
    detection_hints TEXT[],
    frequency INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_missing_bank ON missing_patterns (bank_name);

-- 半角カナ辞書テーブル
CREATE TABLE IF NOT EXISTS kana_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kana_text VARCHAR(255) NOT NULL UNIQUE,
    converted_text VARCHAR(255) NOT NULL,
    confidence_score FLOAT DEFAULT 0.9,
    usage_count INTEGER DEFAULT 0,
    bank_specific VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kana_text ON kana_dictionary (kana_text);
CREATE INDEX IF NOT EXISTS idx_kana_usage ON kana_dictionary (usage_count DESC);

-- 初期データ投入：半角カナ辞書
INSERT INTO kana_dictionary (kana_text, converted_text, confidence_score) VALUES
('ｼｬｶｲﾎｹﾝﾘｮｳ', '社会保険料', 0.95),
('ﾃﾞﾝｷﾀﾞｲ', '電気代', 0.90),
('ｶﾞｽﾀﾞｲ', 'ガス代', 0.90),
('ｽｲﾄﾞｳﾀﾞｲ', '水道代', 0.90),
('ｷｭｳﾖ', '給与', 0.95),
('ｼｮｳﾖ', '賞与', 0.95),
('ﾈﾝｷﾝ', '年金', 0.95),
('ﾌﾘｺﾐ', '振込', 0.90),
('ﾃｽｳﾘｮｳ', '手数料', 0.90),
('ｶ)', '株式会社', 0.85),
('ﾕ)', '有限会社', 0.85),
('ｼﾞﾄﾞｳﾋｷｵﾄｼ', '自動引落', 0.90),
('ｹｲﾀｲ', '携帯', 0.85),
('ﾎｹﾝ', '保険', 0.90),
('ｼﾞｭｳﾀｸﾛｰﾝ', '住宅ローン', 0.95),
('ｶｰﾄﾞ', 'カード', 0.90),
('ATM', 'ATM', 1.0),
('ﾘｰｽ', 'リース', 0.90)
ON CONFLICT (kana_text) DO NOTHING;

-- 銀行別テンプレート初期データ
INSERT INTO column_mappings (bank_name, original_name, display_name, standard_name, data_type, position) VALUES
-- GMOあおぞら銀行
('GMOあおぞら', '取引日', '日付', 'date', 'date', 1),
('GMOあおぞら', 'お取引内容', '摘要', 'description', 'text', 2),
('GMOあおぞら', 'お引出し', '出金', 'withdrawal', 'currency', 3),
('GMOあおぞら', 'お預入れ', '入金', 'deposit', 'currency', 4),
('GMOあおぞら', '残高', '残高', 'balance', 'currency', 5),
-- 三菱UFJ銀行
('三菱UFJ', '日付', '日付', 'date', 'date', 1),
('三菱UFJ', '摘要', '摘要', 'description', 'text', 2),
('三菱UFJ', '支払金額', '出金', 'withdrawal', 'currency', 3),
('三菱UFJ', '預り金額', '入金', 'deposit', 'currency', 4),
('三菱UFJ', '差引残高', '残高', 'balance', 'currency', 5),
-- みずほ銀行
('みずほ', '取引日', '日付', 'date', 'date', 1),
('みずほ', 'お取引内容', '摘要', 'description', 'text', 2),
('みずほ', 'お支払金額', '出金', 'withdrawal', 'currency', 3),
('みずほ', 'お預り金額', '入金', 'deposit', 'currency', 4),
('みずほ', 'お取引後残高', '残高', 'balance', 'currency', 5)
ON CONFLICT DO NOTHING;

-- デフォルトエクスポートプリセット
INSERT INTO export_presets (preset_name, description, columns, export_settings, target_software, is_default) VALUES
('標準CSV', 'デフォルトのCSV形式', 
 '["date", "description", "withdrawal", "deposit", "balance"]'::jsonb,
 '{"delimiter": ",", "encoding": "UTF-8 BOM", "dateFormat": "YYYY/MM/DD", "numberFormat": {"thousandSeparator": false, "decimalPlaces": 0}}'::jsonb,
 'general', TRUE),
('Excel用', 'Microsoft Excel向け', 
 '["date", "description", "withdrawal", "deposit", "balance"]'::jsonb,
 '{"delimiter": ",", "encoding": "UTF-8 BOM", "dateFormat": "YYYY/MM/DD", "numberFormat": {"thousandSeparator": true, "decimalPlaces": 0}}'::jsonb,
 'excel', FALSE),
('会計ソフト用', '会計ソフト連携用', 
 '["date", "description", "withdrawal", "deposit"]'::jsonb,
 '{"delimiter": ",", "encoding": "Shift-JIS", "dateFormat": "YYYY/MM/DD", "numberFormat": {"thousandSeparator": false, "decimalPlaces": 0}}'::jsonb,
 'accounting', FALSE)
ON CONFLICT DO NOTHING;