/**
 * 学習システムAPIクライアント
 */

import axios from 'axios';

// 開発環境ではプロキシを通じてアクセス
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_URL || 'http://localhost:8000')
  : '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// 型定義
export interface CorrectionData {
  file_id: string;
  original_data: Record<string, any>;
  corrected_data: Record<string, any>;
  correction_type: 'cell_edit' | 'row_add' | 'row_delete' | 'column_add' | 'column_rename';
  position_info?: Record<string, any>;
  user_id?: string;
}

export interface ColumnMapping {
  id?: string;
  bank_name?: string;
  original_name: string;
  display_name: string;
  standard_name: string;
  data_type: 'date' | 'text' | 'number' | 'currency';
  position: number;
  validation_rules?: Record<string, any>;
  is_visible?: boolean;
  is_editable?: boolean;
  is_required?: boolean;
}

export interface CustomColumn {
  id?: string;
  file_id: string;
  column_name: string;
  data_type: string;
  default_value?: any;
  formula?: string;
  options?: string[];
  values?: Record<string, any>;
  position?: number;
}

export interface ExportPreset {
  id?: string;
  preset_name: string;
  description?: string;
  columns: string[];
  export_settings: {
    delimiter: string;
    encoding: string;
    dateFormat: string;
    numberFormat: {
      thousandSeparator: boolean;
      decimalPlaces: number;
    };
  };
  target_software?: string;
  is_default?: boolean;
}

export interface KanaDictionaryEntry {
  kana_text: string;
  converted_text: string;
  confidence_score: number;
  usage_count: number;
  bank_specific?: string;
}

export interface PatternAnalysis {
  analysis: {
    frequent_corrections: Array<{
      pattern_type: string;
      original_pattern: string;
      corrected_pattern: string;
      frequency: number;
      confidence_score: number;
    }>;
    correction_stats: Array<{
      correction_type: string;
      count: number;
    }>;
    bank_patterns: Array<{
      bank_name: string;
      pattern_type: string;
      count: number;
    }>;
  };
  metrics: {
    recent_corrections: number;
    pattern_count: number;
    average_confidence: number;
  };
}

// API関数

/**
 * 修正履歴を記録
 */
export const recordCorrection = async (correction: CorrectionData): Promise<void> => {
  await apiClient.post('/api/learning/corrections', correction);
};

/**
 * パターン分析を取得
 */
export const getPatternAnalysis = async (limit: number = 100): Promise<PatternAnalysis> => {
  const response = await apiClient.get('/api/learning/patterns/analysis', {
    params: { limit }
  });
  return response.data;
};

/**
 * 銀行別カラムマッピングを取得
 */
export const getColumnMappings = async (bankName: string): Promise<ColumnMapping[]> => {
  const response = await apiClient.get(`/api/learning/column-mappings/${encodeURIComponent(bankName)}`);
  return response.data;
};

/**
 * カラムマッピングを保存
 */
export const saveColumnMappings = async (
  bankName: string,
  mappings: ColumnMapping[]
): Promise<void> => {
  await apiClient.post('/api/learning/column-mappings', {
    bank_name: bankName,
    mappings
  });
};

/**
 * カスタム列を追加
 */
export const addCustomColumn = async (column: CustomColumn): Promise<string> => {
  const response = await apiClient.post('/api/learning/custom-columns', column);
  return response.data.column_id;
};

/**
 * ファイルのカスタム列を取得
 */
export const getCustomColumns = async (fileId: string): Promise<CustomColumn[]> => {
  const response = await apiClient.get(`/api/learning/custom-columns/${fileId}`);
  return response.data;
};

/**
 * エクスポートプリセットを保存
 */
export const saveExportPreset = async (
  preset: ExportPreset,
  userId?: string
): Promise<string> => {
  const response = await apiClient.post('/api/learning/export-presets', preset, {
    params: { user_id: userId }
  });
  return response.data.preset_id;
};

/**
 * エクスポートプリセットを取得
 */
export const getExportPresets = async (userId?: string): Promise<ExportPreset[]> => {
  const response = await apiClient.get('/api/learning/export-presets', {
    params: { user_id: userId }
  });
  return response.data;
};

/**
 * 半角カナ辞書を取得
 */
export const getKanaDictionary = async (limit: number = 100): Promise<KanaDictionaryEntry[]> => {
  const response = await apiClient.get('/api/learning/kana-dictionary', {
    params: { limit }
  });
  return response.data;
};

/**
 * 半角カナ辞書にエントリを追加
 */
export const addKanaEntry = async (
  kanaText: string,
  convertedText: string,
  bankSpecific?: string
): Promise<void> => {
  await apiClient.post('/api/learning/kana-dictionary', null, {
    params: {
      kana_text: kanaText,
      converted_text: convertedText,
      bank_specific: bankSpecific
    }
  });
};

/**
 * 学習パターンを適用
 */
export const applyLearning = async (
  transactions: any[],
  bankName?: string
): Promise<any[]> => {
  const response = await apiClient.post('/api/learning/apply-learning', transactions, {
    params: { bank_name: bankName }
  });
  return response.data;
};