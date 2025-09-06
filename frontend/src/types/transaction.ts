export interface TransactionData {
  date: string;
  description: string;
  withdrawal?: number;
  deposit?: number;
  balance: number;
  confidence_score: number;
  [key: string]: any; // 動的な列追加に対応
}

export interface ProcessingResult {
  id: string;
  filename: string;
  status: string;
  transactions: TransactionData[];
  confidence_score: number;
  processing_time: number;
  processing_method?: string;
  claude_confidence?: number;
  gpt4v_confidence?: number;
  agreement_score?: number;
}