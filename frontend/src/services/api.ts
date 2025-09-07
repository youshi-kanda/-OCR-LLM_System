import axios from 'axios';
import { ProcessingResult, TransactionData } from '../types/transaction';

// 開発環境ではプロキシを通じてアクセス、本番環境では環境変数を使用
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_URL || 'http://localhost:8000')
  : '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分タイムアウト
});

export const uploadFile = async (file: File): Promise<ProcessingResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getResult = async (fileId: string): Promise<ProcessingResult> => {
  const response = await apiClient.get(`/results/${fileId}`);
  return response.data;
};

export const updateTransactions = async (
  fileId: string, 
  transactions: TransactionData[]
): Promise<void> => {
  await apiClient.put(`/results/${fileId}/transactions`, transactions);
};

export const downloadCSV = async (fileId: string): Promise<void> => {
  try {
    const response = await apiClient.get(`/results/${fileId}/csv`, {
      responseType: 'blob',
      timeout: 30000, // 30秒タイムアウト
    });

    // Content-Dispositionヘッダーからファイル名を取得
    let filename = `${fileId}.csv`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      } else {
        const simpleFilenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (simpleFilenameMatch) {
          filename = simpleFilenameMatch[1];
        }
      }
    }

    // Blobオブジェクトの作成（MIME type明示）
    const blob = new Blob([response.data], { 
      type: 'text/csv;charset=utf-8' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    
    // より確実なダウンロード実行
    document.body.appendChild(link);
    link.style.display = 'none';
    link.click();
    
    // クリーンアップ
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error: any) {
    console.error('CSV download error:', error);
    
    // エラーメッセージの生成
    let errorMessage = 'CSVファイルのダウンロードに失敗しました。';
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage = 'ダウンロードがタイムアウトしました。もう一度お試しください。';
    } else if (error.response?.status === 404) {
      errorMessage = '指定されたファイルが見つかりません。';
    } else if (error.response?.status >= 500) {
      errorMessage = 'サーバーエラーが発生しました。しばらく待ってからお試しください。';
    } else if (!navigator.onLine) {
      errorMessage = 'インターネット接続を確認してください。';
    }
    
    // エラーをユーザーに表示（グローバルエラーハンドラーで処理される想定）
    throw new Error(errorMessage);
  }
};

export interface HistoryItem {
  id: string;
  filename: string;
  confidence_score: number;
  processing_time: number;
  created_at: string;
  transaction_count: number;
  processing_method?: string;
  status: string;
}

export const getHistory = async (): Promise<HistoryItem[]> => {
  const response = await apiClient.get('/history');
  return response.data.history;
};